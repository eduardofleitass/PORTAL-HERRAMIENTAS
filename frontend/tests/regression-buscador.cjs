const { chromium } = require('playwright');

/**
 * TEST - Bug del buscador que expulsaba la sesion.
 *
 * Reportado: "cuando queres buscar algo en la barra de busqueda te desconecta
 * por inactivacion".
 *
 * Causa: SearchModal hacia fetch() a /documentacion, /errores y
 * /procedimientos SIN el header Authorization. Esos endpoints estan
 * protegidos con AuthGuard + ModuloGuard, respondian 401, y
 * SessionInterceptor interpretaba el 401 como sesion expirada y expulsaba.
 *
 * Este test verifica que buscar YA NO expulsa la sesion.
 */
const BASE = process.env.BASE || 'http://localhost:3001';
const PW = process.env.PORTAL_PASS || 'admin';

let pass = 0, fail = 0;
const fallos = [];

function check(nombre, ok, detalle = '') {
  if (ok) { pass++; console.log(`PASS | ${nombre}${detalle ? ' :: ' + detalle : ''}`); }
  else { fail++; fallos.push({ nombre, detalle }); console.log(`FAIL | ${nombre}${detalle ? ' :: ' + detalle : ''}`); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const peticiones401 = [];
  const peticionesBusqueda = [];

  page.on('response', async (r) => {
    const url = r.url();
    // Registrar las llamadas que hace el buscador
    if (/\/(documentacion|errores|procedimientos)$/.test(url)) {
      const auth = r.request().headers()['authorization'];
      peticionesBusqueda.push({
        ruta: url.replace(BASE, ''),
        status: r.status(),
        tieneToken: !!auth,
      });
    }
    if (r.status() === 401 && !url.includes('/auth/')) {
      peticiones401.push(url);
    }
  });

  console.log(`Base: ${BASE}\n`);

  // 1. Login
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const inputs = await page.$$('input');
  await inputs[0].fill(process.env.PORTAL_USER || 'admin');
  await (await page.$('input[type="password"]')).fill(PW);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const logueado = await page.evaluate(() => !!localStorage.getItem('token'));
  check('Login OK', logueado, `token=${logueado ? 'presente' : 'AUSENTE'}`);
  if (!logueado) {
    const cuerpo = await page.evaluate(() => document.body.innerText);
    console.log('   Pantalla:', cuerpo.substring(0, 200).replace(/\n+/g, ' | '));
    await browser.close();
    process.exit(1);
  }

  const tokenAntes = await page.evaluate(() => localStorage.getItem('token'));

  // 2. Abrir el buscador (Ctrl+K o click en la barra)
  console.log('\n===== ABRIENDO EL BUSCADOR =====');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(1200);

  const modalVisible = await page.evaluate(() => !!document.querySelector('.search-modal'));
  check('El buscador se abre', modalVisible);

  if (!modalVisible) {
    // Plan B: click en la barra de busqueda del sidebar
    const barra = await page.$('.sidebar-search, .busqueda-input, [placeholder*="Buscar"]');
    if (barra) { await barra.click(); await page.waitForTimeout(1200); }
  }

  // 3. Escribir en el buscador (esto dispara los fetch)
  console.log('\n===== ESCRIBIENDO EN EL BUSCADOR =====');
  const searchInput = await page.$('.search-input');
  check('Campo de busqueda presente', !!searchInput);

  if (searchInput) {
    await searchInput.fill('manual');
    await page.waitForTimeout(3000);   // esperar el debounce + las 3 peticiones
  }

  // 4. Verificar que las peticiones llevaron token
  console.log('\n===== PETICIONES DEL BUSCADOR =====');
  peticionesBusqueda.forEach(p => {
    console.log(`  ${p.ruta.padEnd(18)} status=${p.status} token=${p.tieneToken ? 'SI' : 'NO'}`);
  });
  check('El buscador hizo peticiones', peticionesBusqueda.length > 0,
        `${peticionesBusqueda.length} peticiones`);

  const sinToken = peticionesBusqueda.filter(p => !p.tieneToken);
  check('Todas las peticiones llevan Authorization', sinToken.length === 0,
        sinToken.length ? `${sinToken.length} sin token` : 'todas con token');

  const con401 = peticionesBusqueda.filter(p => p.status === 401);
  check('Ninguna peticion devolvio 401', con401.length === 0,
        con401.length ? `${con401.length} con 401` : 'sin 401');

  // 5. LA PRUEBA CLAVE: la sesion sigue viva despues de buscar
  console.log('\n===== LA SESION SOBREVIVIO? =====');
  await page.waitForTimeout(2000);
  const sigueLogueado = await page.evaluate(() => !!localStorage.getItem('token'));
  const hash = await page.evaluate(() => location.hash);
  const enLogin = hash.includes('/login');

  check('La sesion NO se cerro al buscar', sigueLogueado && !enLogin,
        `token=${sigueLogueado ? 'presente' : 'AUSENTE'} hash=${hash}`);

  // 6. Los resultados llegaron (si hay datos que coincidan)
  const resultados = await page.evaluate(() => {
    const items = document.querySelectorAll('.search-result-item');
    const vacio = document.querySelector('.search-empty');
    return { cantidad: items.length, sinResultados: !!vacio };
  });
  check('El buscador devolvio resultados', resultados.cantidad > 0,
        `${resultados.cantidad} resultados${resultados.sinResultados ? ' (mostro "sin resultados")' : ''}`);

  // 7. Ningun 401 inesperado en toda la operacion
  check('Sin 401 inesperados (que disparan el logout)', peticiones401.length === 0,
        peticiones401.length ? peticiones401.slice(0, 2).join(' | ') : 'ninguno');

  await page.screenshot({ path: 'bug-buscador.png', fullPage: false });

  console.log('\n========================================');
  console.log(`TOTAL: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  if (fallos.length) {
    console.log('\nFALLOS:');
    fallos.forEach(f => console.log(`  - ${f.nombre} ${f.detalle}`));
  }
  console.log('========================================');

  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
