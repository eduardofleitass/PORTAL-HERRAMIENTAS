const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'responsive-audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop',   width: 1440, height: 900 },
  { name: 'tablet',    width: 820,  height: 1180 },
  { name: 'mobile',    width: 390,  height: 844 },
  { name: 'mobile-sm', width: 320,  height: 568 },
];

const PAGES = [
  { name: '01-login',          hash: '#/login',           needsAuth: false },
  { name: '02-dashboard',      hash: '#/',                needsAuth: true },
  { name: '03-procedimientos', hash: '#/procedimientos',  needsAuth: true },
  { name: '04-errores',        hash: '#/errores',         needsAuth: true },
  { name: '05-documentacion',  hash: '#/documentacion',   needsAuth: true },
  { name: '06-logs',           hash: '#/logs',            needsAuth: true },
  { name: '07-usuarios',       hash: '#/usuarios',        needsAuth: true },
  { name: '08-perfil',         hash: '#/perfil',          needsAuth: true },
];

const BASE = 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Login primero (una vez por contexto)
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const allInputs = await page.$$('input');
    const passInput = await page.$('input[type="password"]');
    if (allInputs.length >= 2 && passInput) {
      await allInputs[0].fill('admin');
      await passInput.fill('admin');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    const loggedIn = await page.evaluate(() => !!localStorage.getItem('token'));
    console.log(`[${vp.name}] login: ${loggedIn ? 'OK' : 'FALLO'}`);

    for (const p of PAGES) {
      if (p.needsAuth && !loggedIn) continue;
      try {
        await page.goto(`${BASE}/${p.hash}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(900);

        const info = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          return {
            scrollW: Math.max(doc.scrollWidth, body.scrollWidth),
            clientW: doc.clientWidth,
            scrollH: Math.max(doc.scrollHeight, body.scrollHeight),
            clientH: doc.clientHeight,
            overflowX: Math.max(doc.scrollWidth, body.scrollWidth) > doc.clientWidth + 2,
          };
        });

        const file = path.join(OUT, `${vp.name}-${p.name}.png`);
        await page.screenshot({ path: file, fullPage: true });

        report.push({
          viewport: vp.name,
          vw: vp.width,
          page: p.name,
          overflowX: info.overflowX,
          scrollW: info.scrollW,
          clientW: info.clientW,
          scrollH: info.scrollH,
        });

        const flag = info.overflowX ? `OVERFLOW-X (${info.scrollW} > ${info.clientW})` : 'ok';
        console.log(`[${vp.name}] ${p.name}: ${flag}`);
      } catch (e) {
        console.log(`[${vp.name}] ${p.name}: ERROR ${e.message}`);
      }
    }

    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n=== RESUMEN OVERFLOW HORIZONTAL ===');
  const bad = report.filter(r => r.overflowX);
  if (bad.length === 0) {
    console.log('Ninguna pantalla tiene overflow horizontal');
  } else {
    bad.forEach(r => console.log(`${r.viewport} (${r.vw}px) - ${r.page}: scrollW=${r.scrollW} clientW=${r.clientW}`));
  }
  console.log(`\nScreenshots en: ${OUT}`);
})();
