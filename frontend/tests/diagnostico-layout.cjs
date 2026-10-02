const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3001';
const USER = process.env.PORTAL_USER || 'admin';
const PASS = process.env.PORTAL_PASS || '';

/**
 * Diagnostico del layout al colapsar el sidebar.
 *
 * Se autentica, recorre las 7 paginas, y mide el contenedor raiz de cada una
 * con el sidebar abierto y colapsado, para detectar contenido descentrado.
 */
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 900 } });
  const page = await ctx.newPage();

  // --- Login ---
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const inputs = await page.$$('input');
  if (inputs.length < 2) { console.log('No se encontro el formulario de login'); await browser.close(); process.exit(1); }
  await inputs[0].fill(USER);
  await (await page.$('input[type="password"]')).fill(PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const logueado = await page.evaluate(() => !!localStorage.getItem('token'));
  if (!logueado) {
    const cuerpo = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log('Login fallo:', cuerpo.substring(0, 150).replace(/\n+/g, ' | '));
    await browser.close();
    process.exit(1);
  }
  console.log(`Logueado como ${USER} (viewport 1920px)\n`);

  const paginas = [
    ['#/', '.dashboard-container', 'Dashboard'],
    ['#/procedimientos', '.procedimientos-page', 'Procedimientos'],
    ['#/errores', '.errores-page', 'Errores'],
    ['#/documentacion', '.documentacion-page', 'Documentacion'],
    ['#/logs', '.logs-page', 'Actividad'],
    ['#/usuarios', '.page-container', 'Usuarios'],
    ['#/perfil', '.perfil-page', 'Perfil'],
  ];

  const VISTA = 1920;
  let desbalanceados = 0;

  for (const [hash, sel, nombre] of paginas) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1600);

    // Medir con el sidebar abierto
    const abierto = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(r.left), w: Math.round(r.width), maxW: cs.maxWidth, ml: cs.marginLeft, mr: cs.marginRight };
    }, sel);

    if (!abierto) {
      console.log(`${nombre.padEnd(15)} (no se encontro ${sel})`);
      continue;
    }

    // Colapsar el sidebar
    await page.evaluate(() => {
      const sb = document.querySelector('.sidebar');
      const main = document.querySelector('.main-content');
      if (sb) sb.classList.add('colapsado');
      if (main) main.classList.add('main-full');
    });
    await page.waitForTimeout(900);

    const cerrado = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), w: Math.round(r.width) };
    }, sel);

    const izqA = abierto.x;
    const derA = VISTA - (abierto.x + abierto.w);
    const izqC = cerrado.x;
    const derC = VISTA - (cerrado.x + cerrado.w);
    const centrado = Math.abs(izqC - derC) <= 8;

    const marca = centrado ? 'CENTRADO' : '>>> DESCENTRADO';
    if (!centrado) desbalanceados++;

    console.log(`${nombre.padEnd(15)} max-width=${String(abierto.maxW).padEnd(8)}`);
    console.log(`  abierto : izq=${String(izqA).padStart(4)} der=${String(derA).padStart(4)}`);
    console.log(`  colapsado: izq=${String(izqC).padStart(4)} der=${String(derC).padStart(4)}  ${marca}`);

    // Reabrir para la siguiente
    await page.evaluate(() => {
      const sb = document.querySelector('.sidebar');
      const main = document.querySelector('.main-content');
      if (sb) sb.classList.remove('colapsado');
      if (main) main.classList.remove('main-full');
    });
    await page.waitForTimeout(500);
  }

  console.log(`\n========================================`);
  console.log(`Paginas descentradas: ${desbalanceados} de ${paginas.length}`);
  console.log('========================================');

  await browser.close();
  process.exit(desbalanceados === 0 ? 0 : 1);
})();
