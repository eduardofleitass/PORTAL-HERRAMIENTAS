const { chromium } = require('playwright');

/**
 * Verifica que el portal desplegado en produccion funcione accedido
 * por la IP de red local, que es como lo usara el equipo.
 */
const BASE = process.env.BASE || 'http://192.168.34.67:3001';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('favicon')) {
      errores.push(`HTTP ${r.status()} ${r.url()}`);
    }
  });

  console.log(`Base: ${BASE}\n`);

  // 1. Cargar el portal
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const titulo = await page.title();
  console.log(`1. Titulo cargado: "${titulo}"`);

  // 2. Verificar donde apunta la API resuelta
  const apiUrl = await page.evaluate(() => {
    // El modulo de config no expone API_URL al window, pero podemos
    // inferirla observando a donde van las peticiones fetch.
    return window.location.origin;
  });
  console.log(`2. Origen de la pagina: ${apiUrl}`);

  // 3. Login
  const inputs = await page.$$('input');
  if (inputs.length < 2) {
    console.log('   ERROR: no se encontraron los campos de login');
    await browser.close();
    process.exit(1);
  }
  await inputs[0].fill('admin');
  await (await page.$('input[type="password"]')).fill(process.env.PW || 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const logueado = await page.evaluate(() => !!localStorage.getItem('token'));
  const hash = await page.evaluate(() => location.hash);
  console.log(`3. Login: ${logueado ? 'OK' : 'FALLO'} (hash=${hash})`);

  if (!logueado) {
    const cuerpo = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log('   Texto en pantalla:', cuerpo.substring(0, 200).replace(/\n+/g, ' | '));
  } else {
    // 4. Navegar por los modulos verificando que carguen datos desde la API
    const modulos = ['#/', '#/procedimientos', '#/errores', '#/logs', '#/usuarios'];
    for (const m of modulos) {
      await page.goto(BASE + '/' + m, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800);
      const info = await page.evaluate(() => ({
        hash: location.hash,
        sidebar: !!document.querySelector('.sidebar'),
        texto: document.body.innerText.length,
      }));
      console.log(`4. ${m.padEnd(18)} -> hash=${info.hash.padEnd(18)} sidebar=${info.sidebar ? 'si' : 'NO'} contenido=${info.texto} chars`);
    }
  }

  // 5. Errores de red
  const erroresReales = errores.filter(e => !/favicon|429/.test(e));
  console.log(`\n5. Errores detectados: ${erroresReales.length}`);
  erroresReales.slice(0, 8).forEach(e => console.log(`   - ${e}`));

  await page.screenshot({ path: 'produccion-red-local.png', fullPage: false });
  console.log('\n   Captura: produccion-red-local.png');

  await browser.close();
  process.exit(erroresReales.length === 0 && logueado ? 0 : 1);
})();
