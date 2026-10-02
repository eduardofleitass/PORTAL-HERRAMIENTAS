/**
 * TEST DE REGRESION - Portal de Herramientas EPEM
 * Verifica funcionalidad de los cambios recientes:
 *  - Auth (login/logout, expiracion JWT, inactividad)
 *  - Permisos granulares (modulos + acciones)
 *  - PDF presente / CSV eliminado en todos los modulos
 *  - PDF de Procedimientos exporta contenido detallado
 *  - Sidebar mobile (abrir/cerrar/navegar)
 *  - Responsive sin overflow en 4 viewports
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';
const API = 'http://localhost:3001';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
}

async function login(page, user = process.env.PORTAL_USER || 'admin', pass = process.env.PORTAL_PASS || process.env.PORTAL_USER || 'admin') {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // Reutilizar la sesion si ya hay un token valido: evita gastar intentos
  // del rate limit del backend (5 logins/min por IP) y acelera la suite.
  const yaLogueado = await page.evaluate(() => {
    const t = localStorage.getItem('token');
    if (!t) return false;
    try {
      const p = JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      return p.exp * 1000 > Date.now() + 30000; // al menos 30s de vida
    } catch { return false; }
  });
  if (yaLogueado) {
    await page.evaluate(() => localStorage.setItem('portal-ultima-actividad', String(Date.now())));
    return true;
  }

  const inputs = await page.$$('input');
  if (inputs.length < 2) return false;
  await inputs[0].fill(user);
  const pw = await page.$('input[type="password"]');
  await pw.fill(pass);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);

  const ok = await page.evaluate(() => !!localStorage.getItem('token'));
  if (!ok) {
    // Puede ser rate limiting: esperar y reintentar una vez
    const cuerpo = await page.evaluate(() => document.body.innerText);
    if (/demasiados intentos/i.test(cuerpo)) {
      const m = cuerpo.match(/espere (\d+) segundo/i);
      const espera = m ? (Number(m[1]) + 1) * 1000 : 2000;
      console.log(`  (rate limit: esperando ${espera/1000}s)`);
      await page.waitForTimeout(espera);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2200);
      return await page.evaluate(() => !!localStorage.getItem('token'));
    }
  }
  return ok;
}

(async () => {
  const browser = await chromium.launch();

  // ===== 1. LOGIN =====
  console.log('\n===== 1. AUTENTICACION =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const ok = await login(page);
    check('Login admin/admin exitoso', ok);

    const state = await page.evaluate(() => ({
      token: !!localStorage.getItem('token'),
      usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
    }));
    check('Token guardado en localStorage', state.token);
    check('Usuario con permisos cargado', !!state.usuario?.permisos, JSON.stringify(state.usuario?.permisos?.modulos || {}));

    // Token expira en ~3 min (180s)
    if (state.token) {
      const payload = await page.evaluate(() => {
        const t = localStorage.getItem('token');
        try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; }
      });
      if (payload?.exp && payload?.iat) {
        const dur = payload.exp - payload.iat;
        check('JWT expira en 180s (3 min)', dur === 180, `duracion=${dur}s`);
      } else {
        check('JWT tiene exp/iat', false);
      }
    }

    // Logout
    await page.evaluate(() => localStorage.clear());
    await ctx.close();
  }

  // ===== 2. LOGIN FALLIDO =====
  console.log('\n===== 2. LOGIN FALLIDO =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const ok = await login(page, process.env.PORTAL_USER || 'admin', 'passwordincorrecto');
    check('Login con password incorrecta es rechazado', !ok);
    await ctx.close();
  }

  // ===== 3. PERMISOS / BACKEND =====
  console.log('\n===== 3. PERMISOS BACKEND =====');
  {
    // Obtener token admin (credenciales configurables por entorno)
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.PORTAL_USER || 'admin',
        password: process.env.PORTAL_PASS || process.env.PORTAL_USER || 'admin',
      })
    });
    const data = await r.json();
    const token = data.token;

    const noAuth = await fetch(`${API}/procedimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('POST /procedimientos sin token = 401', noAuth.status === 401, `status=${noAuth.status}`);

    const badToken = await fetch(`${API}/procedimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token.invalido.xyz' }, body: '{}' });
    check('POST /procedimientos con token invalido = 401', badToken.status === 401, `status=${badToken.status}`);

    const list = await fetch(`${API}/procedimientos`, { headers: { Authorization: `Bearer ${token}` } });
    check('GET /procedimientos con token admin = 200', list.status === 200, `status=${list.status}`);

    const logs = await fetch(`${API}/logs`, { headers: { Authorization: `Bearer ${token}` } });
    check('GET /logs con admin = 200', logs.status === 200, `status=${logs.status}`);

    const users = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
    check('GET /usuarios con admin = 200', users.status === 200, `status=${users.status}`);
  }

  // ===== 4. MODULOS: PDF SI / CSV NO =====
  console.log('\n===== 4. BOTONES PDF/CSV EN MODULOS =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page);

    for (const [nombre, hash] of [['Procedimientos','#/procedimientos'], ['Errores','#/errores'], ['Documentacion','#/documentacion']]) {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const btns = await page.$$eval('.btn-exportar', els => els.map(e => e.textContent.trim()));
      const hasPDF = btns.some(t => /pdf/i.test(t));
      const hasCSV = btns.some(t => /csv|exportar/i.test(t)) ;
      check(`${nombre}: boton PDF presente`, hasPDF, JSON.stringify(btns));
      check(`${nombre}: boton CSV eliminado`, !hasCSV, JSON.stringify(btns));
    }
    await ctx.close();
  }

  // ===== 5. PDF POPUP CONTENIDO DETALLADO =====
  console.log('\n===== 5. EXPORTAR PDF (popup con detalle) =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page);
    await page.goto(`${BASE}/#/procedimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    let popup = null;
    // El popup se abre con window.open: hay que registrar los listeners ANTES
    // del click, tanto en el contexto como en la pagina.
    ctx.on('page', p => { popup = p; });
    page.on('popup', p => { popup = p; });
    const pdfBtn = await page.$('.btn-exportar');
    if (pdfBtn) {
      await pdfBtn.click();
      await page.waitForTimeout(3500);
    }
    if (popup) {
      const content = await popup.evaluate(() => document.body.innerText);
      check('PDF abre popup', true);
      check('PDF incluye titulo de procedimiento', /crear un usuario nuevo/i.test(content), content.substring(0,80).replace(/\n/g,' '));
      check('PDF incluye pasos numerados', /1\.\S/.test(content) && /2\.\S/.test(content), `pasos detectados: ${/1\.\S/.test(content)}`);
      check('PDF incluye metadatos (modulo/nivel/tiempo)', /Modulo:/i.test(content) && /Nivel:/i.test(content) && /Tiempo:/i.test(content));
      check('PDF tiene contenido sustancial', content.length > 300, `${content.length} chars`);
    } else {
      check('PDF abre popup', false, 'no se detecto popup');
    }
    await ctx.close();
  }

  // ===== 6. SIDEBAR MOBILE =====
  console.log('\n===== 6. SIDEBAR MOBILE =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page);
    // Marcar actividad para que el tick de inactividad no cierre la sesion
    // mientras corre el resto de la seccion
    await page.evaluate(() => localStorage.setItem('portal-ultima-actividad', String(Date.now())));
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const sidebarInfo = await page.evaluate(() => {
      const s = document.querySelector('.sidebar');
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { left: r.left, opacidad: getComputedStyle(s).opacity };
    });
    if (!sidebarInfo) {
      // La sesion pudo expirar por el tick de inactividad durante el test
      check('Sidebar presente en mobile', false, 'sesion expirada durante el test');
    } else {
      const hidden = sidebarInfo.left < -50 || sidebarInfo.opacidad === '0';
      check('Sidebar oculto al inicio en mobile', hidden);
    }

    const hamburgerVisible = await page.evaluate(() => {
      const h = document.querySelector('.mobile-hamburger');
      return h && getComputedStyle(h).display !== 'none';
    });
    check('Hamburger visible en mobile', hamburgerVisible);

    // Abrir
    if (hamburgerVisible) {
      await page.click('.mobile-hamburger');
      await page.waitForTimeout(900);
      const open = await page.evaluate(() => {
        const s = document.querySelector('.sidebar');
        return s.classList.contains('visible-mobile') && s.getBoundingClientRect().left >= -5;
      });
      check('Sidebar se abre con hamburger', open);

      // Overlay
      const ov = await page.evaluate(() => {
        const o = document.querySelector('.sidebar-overlay');
        return o && getComputedStyle(o).display !== 'none';
      });
      check('Overlay visible al abrir sidebar', ov);

      // Navegar cierra sidebar
      await page.click('.sidebar-link');
      await page.waitForTimeout(1200);
      const closedAfterNav = await page.evaluate(() => {
        const s = document.querySelector('.sidebar');
        return !s.classList.contains('visible-mobile');
      });
      check('Sidebar se cierra al navegar', closedAfterNav);
    }
    await ctx.close();
  }

  // ===== 7. RESPONSIVE SIN OVERFLOW =====
  console.log('\n===== 7. RESPONSIVE (overflow horizontal) =====');
  {
    const VIEWPORTS = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 820, height: 1180 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'mobile-sm', width: 320, height: 568 },
    ];
    const HASHES = ['#/', '#/procedimientos', '#/errores', '#/documentacion', '#/logs', '#/usuarios', '#/perfil'];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await login(page);
      let badCount = 0;
      const badList = [];
      for (const h of HASHES) {
        await page.goto(`${BASE}/${h}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const info = await page.evaluate(() => {
          const d = document.documentElement;
          return { sw: Math.max(d.scrollWidth, document.body.scrollWidth), cw: d.clientWidth };
        });
        if (info.sw > info.cw + 2) { badCount++; badList.push(`${h}(${info.sw}>${info.cw})`); }
      }
      check(`${vp.name} (${vp.width}px): sin overflow horizontal`, badCount === 0, badList.join(' '));
      await ctx.close();
    }
  }

  // ===== 8. PAGINAS CARGAN SIN ERRORES =====
  console.log('\n===== 8. PAGINAS CARGAN SIN ERRORES JS =====');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await login(page);
    for (const h of ['#/', '#/procedimientos', '#/errores', '#/documentacion', '#/logs', '#/usuarios', '#/perfil']) {
      await page.goto(`${BASE}/${h}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const hasError = await page.evaluate(() => !!document.querySelector('.error:not(.error-retry)'));
      if (hasError) errors.push(`error visible en ${h}`);
    }
    // Ignorar ruido esperado del entorno de test:
    //  - favicon / React DevTools
    //  - 429 del rate limiting (los tests hacen muchos logins a proposito)
    const realErrors = errors.filter(e =>
      !/favicon|Download the React|429|Too Many Requests/i.test(e)
    );
    check('Sin errores JS en las 7 paginas', realErrors.length === 0, realErrors.slice(0,3).join(' | '));
    await ctx.close();
  }

  await browser.close();

  // ===== RESUMEN =====
  console.log('\n========================================');
  console.log('RESUMEN DE REGRESION');
  console.log('========================================');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log(`TOTAL: ${results.length} | PASS: ${pass} | FAIL: ${fail.length}`);
  if (fail.length) {
    console.log('\nFALLOS:');
    fail.forEach(f => console.log(`  - ${f.name} ${f.detail ? ':: ' + f.detail : ''}`));
  }
  console.log('\nJSON:');
  console.log(JSON.stringify({ total: results.length, pass, fail: fail.length, fallos: fail }, null, 2));
  process.exit(fail.length ? 1 : 0);
})();
