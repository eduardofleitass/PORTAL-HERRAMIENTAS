const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'light-audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5174';
const PAGES = ['#/', '#/procedimientos', '#/errores', '#/documentacion', '#/logs', '#/usuarios', '#/perfil'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const inputs = await page.$$('input');
  await inputs[0].fill('admin');
  await (await page.$('input[type="password"]')).fill('admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);

  // Forzar tema claro ANTES de cada navegacion (localStorage persiste)
  for (const h of PAGES) {
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.goto(`${BASE}/${h}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(700);
    const name = h.replace(/[#/]/g, '').replace(/^$/, 'dashboard') || 'dashboard';
    await page.screenshot({ path: path.join(OUT, `light-${name || 'dashboard'}.png`), fullPage: true });
    console.log(`capturado: light-${name || 'dashboard'}.png`);
  }

  // Verificar variables CSS aplicadas
  const vars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      bgDark: cs.getPropertyValue('--bg-dark').trim(),
      bgCard: cs.getPropertyValue('--bg-card').trim(),
      bgSidebar: cs.getPropertyValue('--bg-sidebar').trim(),
      textPrimary: cs.getPropertyValue('--text-primary').trim(),
      accent: cs.getPropertyValue('--accent').trim(),
    };
  });
  console.log('\nVariables aplicadas:', JSON.stringify(vars, null, 2));

  await browser.close();
})();
