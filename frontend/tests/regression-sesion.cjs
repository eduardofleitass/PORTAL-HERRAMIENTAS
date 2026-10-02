/**
 * TEST DE SESION DESLIZANTE
 *
 * Reproduce el bug reportado: "estaba navegando por los modulos y me saco".
 *
 * Escenarios:
 *  A) Actividad continua > 3 min (navegando por modulos) -> NO debe expulsar
 *  B) Inactividad real de 3 min -> SI debe expulsar con mensaje de inactividad
 *  C) El token se renueva (exp aumenta) mientras hay actividad
 *  D) El refresh funciona con token valido y falla con token vencido
 */
const { chromium } = require('playwright');
const API = 'http://localhost:3001';
const BASE = 'http://localhost:5174';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
}

/**
 * Login resiliente al rate limiting del backend (5 intentos/min por IP).
 * Si detecta 429, espera lo que indique el servidor y reintenta una vez.
 */
async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const inputs = await page.$$('input');
  await inputs[0].fill('admin');
  await (await page.$('input[type="password"]')).fill('admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);

  let ok = await page.evaluate(() => !!localStorage.getItem('token'));
  if (!ok) {
    const cuerpo = await page.evaluate(() => document.body.innerText);
    if (/demasiados intentos/i.test(cuerpo)) {
      const m = cuerpo.match(/espere (\d+) segundo/i);
      const espera = m ? (Number(m[1]) + 1) * 1000 : 2000;
      console.log(`  (rate limit: esperando ${espera / 1000}s)`);
      await page.waitForTimeout(espera);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2200);
      ok = await page.evaluate(() => !!localStorage.getItem('token'));
    }
  }
  return ok;
}

function expDeToken(page) {
  return page.evaluate(() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp; } catch { return null; }
  });
}

(async () => {
  const browser = await chromium.launch();

  // ===== D. API refresh =====
  console.log('\n===== D. API /auth/refresh =====');
  {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    const { token } = await r.json();

    const ok = await fetch(`${API}/auth/refresh`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    const okData = await ok.json();
    check('POST /auth/refresh con token valido = 201/200', ok.status === 201 || ok.status === 200, `status=${ok.status}`);
    // El refresh emite un token con exp = ahora + 3m. Si se pide en el mismo
    // segundo, el string puede coincidir; comparamos el exp (debe ser >= original).
    const expDeJwt = (t) => {
      const p = t.split('.')[1];
      const pad = p + '='.repeat((4 - p.length % 4) % 4);
      return JSON.parse(Buffer.from(pad.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).exp;
    };
    const expOriginal = expDeJwt(token);
    const expNuevo = expDeJwt(okData.token);
    check('Refresh extiende el token (exp >= original)', expNuevo >= expOriginal, `${expOriginal} -> ${expNuevo}`);
    check('Refresh devuelve usuario', !!okData.usuario?.username);

    const noTok = await fetch(`${API}/auth/refresh`, { method: 'POST' });
    check('Refresh sin token = 401', noTok.status === 401, `status=${noTok.status}`);

    const badTok = await fetch(`${API}/auth/refresh`, {
      method: 'POST', headers: { Authorization: 'Bearer token.invalido.xyz' }
    });
    check('Refresh con token invalido = 401', badTok.status === 401, `status=${badTok.status}`);
  }

  // ===== A. Actividad continua > 3 min =====
  console.log('\n===== A. Actividad continua (el bug reportado) =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const ok = await login(page);
    check('Login inicial', ok);

    const expInicial = await expDeToken(page);
    console.log(`  exp inicial: ${expInicial} (${new Date(expInicial*1000).toLocaleTimeString()})`);

    // Navegar por modulos simulando uso real durante > 3 min
    const modulos = ['#/', '#/procedimientos', '#/errores', '#/documentacion', '#/logs', '#/usuarios'];
    const INICIO = Date.now();
    const DURACION_MS = 200 * 1000; // 3 min 20 s
    let expulsado = false;
    let iteraciones = 0;

    while (Date.now() - INICIO < DURACION_MS) {
      const h = modulos[iteraciones % modulos.length];
      await page.goto(`${BASE}/${h}`, { waitUntil: 'domcontentloaded' });
      // Simular interaccion humana (scroll + click)
      await page.mouse.wheel(0, 200);
      await page.mouse.move(300 + (iteraciones % 5) * 40, 400);
      await page.mouse.click(300, 400, { delay: 30 }).catch(() => {});
      await page.waitForTimeout(6000);
      iteraciones++;

      const t = await page.evaluate(() => localStorage.getItem('token'));
      if (!t) { expulsado = true; break; }
    }

    const transcurrido = Math.round((Date.now() - INICIO) / 1000);
    console.log(`  transcurrido: ${transcurrido}s en ${iteraciones} navegaciones`);

    check(`NO expulsa tras ${transcurrido}s de actividad continua`, !expulsado, expulsado ? 'SESION CERRADA (bug)' : '');

    const expFinal = await expDeToken(page);
    console.log(`  exp final: ${expFinal} (${new Date(expFinal*1000).toLocaleTimeString()})`);
    check('Token se renovo (exp aumento)', expFinal > expInicial, `${expInicial} -> ${expFinal}`);

    const hashActual = await page.evaluate(() => location.hash);
    check('Sigue en el portal (no redirigido a login)', !hashActual.includes('login'), `hash=${hashActual}`);

    await ctx.close();
  }

  // ===== B. Inactividad real =====
  console.log('\n===== B. Inactividad real de 3 min =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);
    check('Login para test de inactividad', await page.evaluate(() => !!localStorage.getItem('token')));

    // Simular que la ultima actividad fue hace 3min 10s
    await page.evaluate(() => {
      localStorage.setItem('portal-ultima-actividad', String(Date.now() - (3 * 60 * 1000 + 10000)));
    });

    // Esperar al tick (cada 5s)
    await page.waitForTimeout(12000);

    const t = await page.evaluate(() => localStorage.getItem('token'));
    check('Expulsa tras inactividad >= 3 min', !t, t ? 'sigue logueado' : '');

    const msg = await page.evaluate(() => document.body.innerText);
    check('Mensaje menciona inactividad', /inactividad/i.test(msg), msg.substring(0, 90).replace(/\n/g, ' '));

    await ctx.close();
  }

  // ===== C. Actividad reciente NO expulsa =====
  console.log('\n===== C. Actividad reciente (no debe expulsar) =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);

    // Actividad hace 30s (dentro de la ventana)
    await page.evaluate(() => {
      localStorage.setItem('portal-ultima-actividad', String(Date.now() - 30000));
    });
    await page.mouse.move(500, 500); // interaccion real
    await page.waitForTimeout(12000);

    const t = await page.evaluate(() => localStorage.getItem('token'));
    check('No expulsa con actividad de hace 30s', !!t);
    await ctx.close();
  }

  await browser.close();

  console.log('\n========================================');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log(`TOTAL: ${results.length} | PASS: ${pass} | FAIL: ${fail.length}`);
  if (fail.length) { console.log('\nFALLOS:'); fail.forEach(f => console.log(`  - ${f.name} ${f.detail ? ':: '+f.detail : ''}`)); }
  process.exit(fail.length ? 1 : 0);
})();
