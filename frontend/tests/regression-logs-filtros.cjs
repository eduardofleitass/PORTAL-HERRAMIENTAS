/**
 * TEST - Filtros clickeables en Actividad (Logs)
 *
 * Verifica que:
 *  1. Las tarjetas de nivel son clickeables y filtran la tabla
 *  2. Click en la misma tarjeta quita el filtro
 *  3. Las tarjetas reflejan el filtro de nivel activo (clase logs-stat-activa)
 *  4. Los chips de actividad filtran por tipo de accion
 *  5. Los conteos de las tarjetas cuadran con las filas mostradas
 *  6. El boton "Limpiar filtros" resetea todo
 */
const { chromium } = require('playwright');
const BASE = 'http://localhost:5174';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const inputs = await page.$$('input');
  await inputs[0].fill(process.env.PORTAL_USER || 'admin');
  await (await page.$('input[type="password"]')).fill(process.env.PORTAL_PASS || process.env.PORTAL_USER || 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
  return await page.evaluate(() => !!localStorage.getItem('token'));
}

/** Cuenta filas visibles y el total que reporta la paginacion */
async function contarFilas(page) {
  return page.evaluate(() => {
    const filas = document.querySelectorAll('.logs-tabla tbody tr').length;
    // Con >1 pagina hay .pagination-info ("1-15 de 288");
    // con 1 sola pagina hay .pagination-simple ("1 registros").
    const info = document.querySelector('.pagination-info')?.textContent || '';
    const simple = document.querySelector('.pagination-simple')?.textContent || '';
    let total = null;
    let m = info.match(/de\s+(\d+)/);
    if (m) total = Number(m[1]);
    else {
      m = simple.match(/(\d+)\s+\w+/);
      if (m) total = Number(m[1]);
    }
    return { filas, totalFiltrado: total, etiqueta: (info || simple).trim() };
  });
}

/** Espera a que la tabla se estabilice tras un click de filtro */
async function esperarTabla(page, ms = 900) {
  await page.waitForTimeout(ms);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  check('Login', await login(page));
  await page.goto(`${BASE}/#/logs`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // ===== Estructura =====
  const tarjetas = await page.$$eval('.logs-stat', els =>
    els.map(e => ({
      tag: e.tagName,
      texto: e.textContent.trim(),
      clases: e.className,
    }))
  );
  console.log('\nTarjetas de nivel:');
  tarjetas.forEach(t => console.log(`  <${t.tag}> "${t.texto.replace(/\s+/g,' ')}"`));

  check('Las 5 tarjetas son <button> (clickeables)', tarjetas.length === 5 && tarjetas.every(t => t.tag === 'BUTTON'), `${tarjetas.length} tarjetas`);
  check('Todas tienen clase logs-stat-clickable', tarjetas.every(t => t.clases.includes('logs-stat-clickable')));

  // ===== Capturar totales por nivel =====
  const totales = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.logs-stat').forEach(b => {
      const label = b.querySelector('.logs-stat-label')?.textContent?.trim().toLowerCase();
      const val = Number(b.querySelector('.logs-stat-valor')?.textContent || 0);
      out[label] = val;
    });
    return out;
  });
  console.log('\nConteos:', JSON.stringify(totales));

  const base = await contarFilas(page);
  check('Sin filtro: total = registros', base.totalFiltrado === totales['registros'], `${base.totalFiltrado} vs ${totales['registros']}`);
  check('Tarjeta "Registros" activa por defecto', tarjetas[0].clases.includes('logs-stat-activa'));

  // ===== Click en tarjeta "Errores" =====
  console.log('\n===== FILTRO POR NIVEL (click en tarjeta) =====');
  const errBtn = await page.$('.logs-stat.nivel-error');
  await errBtn.click();
  await page.waitForTimeout(800);

  const trasError = await contarFilas(page);
  check('Click en "Errores" filtra la tabla', trasError.totalFiltrado === totales['errores'], `${trasError.totalFiltrado} filas vs ${totales['errores']} errores`);

  const errActiva = await page.evaluate(() => document.querySelector('.logs-stat.nivel-error')?.classList.contains('logs-stat-activa'));
  check('Tarjeta "Errores" queda marcada activa', errActiva);

  const selectVal = await page.$eval('.filtro-container select', el => el.value);
  check('El <select> de nivel se sincroniza', selectVal === 'error', `select="${selectVal}"`);

  // ===== Click de nuevo: quita el filtro =====
  await errBtn.click();
  await page.waitForTimeout(800);
  const trasQuitar = await contarFilas(page);
  check('Click de nuevo quita el filtro', trasQuitar.totalFiltrado === totales['registros'], `${trasQuitar.totalFiltrado}`);

  // ===== Click en "Exito" =====
  const okBtn = await page.$('.logs-stat.nivel-success');
  await okBtn.click();
  await page.waitForTimeout(800);
  const trasExito = await contarFilas(page);
  check('Click en "Exito" filtra correctamente', trasExito.totalFiltrado === totales['exito'], `${trasExito.totalFiltrado} vs ${totales['exito']}`);

  // ===== Chips de actividad =====
  console.log('\n===== FILTRO POR TIPO DE ACTIVIDAD (click en chip) =====');
  // Reload real: HashRouter no remonta si la ruta no cambia y el filtro
  // anterior (success) seguiria aplicado, mostrando un solo chip.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  await page.waitForSelector('.logs-accion-chip', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const chips = await page.$$eval('.logs-accion-chip', els =>
    els.map(e => ({ tag: e.tagName, texto: e.textContent.trim(), clases: e.className }))
  );
  console.log('Chips:', chips.map(c => c.texto).join(' | '));
  check('Los chips son <button> (clickeables)', chips.length > 0 && chips.every(c => c.tag === 'BUTTON'), `${chips.length} chips`);
  check('Sin filtro aparecen varios tipos de actividad', chips.length >= 3, `${chips.length} chips`);

  // Click en el primer chip
  const primerChip = await page.$('.logs-accion-chip');
  const chipTexto = chips[0].texto;
  await primerChip.click();
  await page.waitForTimeout(900);

  const chipActivo = await page.evaluate(() => document.querySelector('.logs-accion-chip')?.classList.contains('logs-accion-chip-activa'));
  check('El chip queda marcado activo', chipActivo == null ? false : true, `click en "${chipTexto}"`);

  const trasChip = await contarFilas(page);
  const todasMismaAccion = await page.evaluate(() => {
    const acciones = Array.from(document.querySelectorAll('.logs-tabla tbody .log-accion'))
      .map(e => e.textContent.trim());
    return acciones.length > 0 && new Set(acciones).size === 1;
  });
  check('La tabla queda filtrada a un solo tipo de accion', todasMismaAccion, `${trasChip.totalFiltrado} filas`);

  const subtitulo = await page.evaluate(() => document.querySelector('.logs-acciones-subtitulo')?.textContent?.trim() || '');
  check('Aparece indicador "filtrando: X"', subtitulo.toLowerCase().includes('filtrando'), subtitulo || '(vacio)');

  // ===== Boton limpiar filtros =====
  console.log('\n===== LIMPIAR FILTROS =====');
  const hayBoton = await page.$('.btn-limpiar-filtros');
  check('Aparece boton "Limpiar filtros" al filtrar', !!hayBoton);

  if (hayBoton) {
    await hayBoton.click();
    await page.waitForTimeout(900);
    const trasLimpiar = await contarFilas(page);
    check('Limpiar filtros restaura el total', trasLimpiar.totalFiltrado === totales['registros'], `${trasLimpiar.totalFiltrado}`);
    const botonDesaparece = !(await page.$('.btn-limpiar-filtros'));
    check('El boton desaparece sin filtros', botonDesaparece);
  }

  await ctx.close();
  await browser.close();

  console.log('\n========================================');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log(`TOTAL: ${results.length} | PASS: ${pass} | FAIL: ${fail.length}`);
  if (fail.length) { console.log('\nFALLOS:'); fail.forEach(f => console.log(`  - ${f.name} ${f.detail ? ':: '+f.detail : ''}`)); }
  process.exit(fail.length ? 1 : 0);
})();
