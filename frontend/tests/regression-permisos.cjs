/**
 * TEST #3 - Usuario no-admin creado temporalmente para validar permisos granulares
 * Crea un usuario rol="usuario" con permisos especificos, prueba el flujo, y lo elimina.
 */
const { chromium } = require('playwright');
const BASE = 'http://localhost:5174';
const API = 'http://localhost:3001';
const fs = require('fs');
const path = require('path');

const USUARIOS_JSON = 'C:/Users/eduardo.fleitas/Music/Proyecto Soporte/PORTAL_DE_HERRAMIENTAS/backend/data/usuarios.json';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
}

(async () => {
  // Backup del JSON
  const backup = fs.readFileSync(USUARIOS_JSON, 'utf-8');
  const usuarios = JSON.parse(backup);
  const maxId = Math.max(...usuarios.map(u => u.id || 0));
  const TEST_ID = maxId + 100;

  const browser = await chromium.launch();

  try {
    // ===== Crear usuario de prueba via API (admin) =====
    const loginAdmin = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    const adminData = await loginAdmin.json();
    const adminToken = adminData.token;

    const crearResp = await fetch(`${API}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        username: 'test_regresion',
        password: 'TestReg123',
        nombre: 'Test Regresion',
        rol: 'usuario',
        activo: true,
        permisos: {
          modulos: { dashboard: true, procedimientos: true, errores: true, documentacion: false, actividad: false, usuarios: false },
          acciones: { crear: true, editar: true, eliminar: true, exportarPDF: false, exportarCSV: false }
        }
      })
    });
    console.log('Crear usuario test:', crearResp.status);
    const usuarioTest = await crearResp.json();
    console.log('  id:', usuarioTest.id, '| username:', usuarioTest.username);
    check('Usuario de prueba creado', crearResp.status === 201 || crearResp.status === 200, `status=${crearResp.status}`);

    // ===== Login como el usuario de prueba =====
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const inputs = await page.$$('input');
    await inputs[0].fill('test_regresion');
    await (await page.$('input[type="password"]')).fill('TestReg123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2200);

    const usuario = await page.evaluate(() => JSON.parse(localStorage.getItem('usuario') || 'null'));
    check('Login como usuario no-admin', !!usuario);
    console.log('  rol:', usuario?.rol, '| permisos:', JSON.stringify(usuario?.permisos?.modulos));

    // ===== Sidebar =====
    console.log('\n===== SIDEBAR =====');
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const links = await page.$$eval('.sidebar-link', els => els.map(e => e.textContent.trim()));
    console.log('  Links:', JSON.stringify(links));
    check('Ve Dashboard', links.some(l => /dashboard/i.test(l)));
    check('Ve Procedimientos', links.some(l => /procedimientos/i.test(l)));
    check('Ve Errores', links.some(l => /errores/i.test(l)));
    check('NO ve Documentacion (false)', !links.some(l => /documentacion/i.test(l)));
    check('NO ve Actividad (false)', !links.some(l => /actividad/i.test(l)));
    check('NO ve Usuarios (false)', !links.some(l => /usuarios/i.test(l)));

    // ===== Rutas protegidas =====
    console.log('\n===== RUTAS PROTEGIDAS =====');
    await page.goto(`${BASE}/#/usuarios`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const hashU = await page.evaluate(() => location.hash);
    check('Ruta /usuarios redirige', hashU !== '#/usuarios', `hash=${hashU}`);

    // ===== Botones de accion =====
    console.log('\n===== BOTONES =====');
    await page.goto(`${BASE}/#/procedimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btnNuevo = await page.$('.btn-nuevo');
    check('Boton Nuevo visible (crear=true)', !!btnNuevo);
    const pdfBtns = await page.$$eval('.btn-exportar', els => els.map(e => e.textContent.trim()));
    check('NO ve boton PDF (exportarPDF=false)', !pdfBtns.some(t => /pdf/i.test(t)), JSON.stringify(pdfBtns));

    // ===== Backend granular =====
    console.log('\n===== BACKEND GRANULAR =====');
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const post = await fetch(`${API}/procedimientos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ titulo: 'TEST REGRESION temp', modulo: 'TEST', nivel: 'basico', tiempo_estimado: '1 minuto', pasos: [{ orden: 1, descripcion: 'test' }] })
    });
    check('POST permitido (crear=true)', post.status === 201 || post.status === 200, `status=${post.status}`);

    let creadoId = null;
    if (post.status === 201 || post.status === 200) {
      const obj = await post.json();
      creadoId = obj.id;
      const patch = await fetch(`${API}/procedimientos/${creadoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titulo: 'TEST REGRESION temp editado' })
      });
      check('PATCH permitido (editar=true)', patch.status === 200, `status=${patch.status}`);

      const del = await fetch(`${API}/procedimientos/${creadoId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      check('DELETE permitido (eliminar=true)', del.status === 200 || del.status === 204, `status=${del.status}`);
    }

    // ===== Documentacion: NO debe poder crear (modulo false) =====
    const docPost = await fetch(`${API}/documentacion`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ titulo: 'x', descripcion: 'x', seccion: 'x' })
    });
    console.log('  POST /documentacion status:', docPost.status);

    // ===== Logs: usuario sin permiso actividad =====
    const logsGet = await fetch(`${API}/logs`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('  GET /logs status:', logsGet.status);
    check('GET /logs rechazado o limitado', logsGet.status !== 200, `status=${logsGet.status}`);

    await ctx.close();
  } finally {
    // Limpieza: borrar usuario de prueba
    fs.writeFileSync(USUARIOS_JSON, backup, 'utf-8');
    console.log('\n[limpieza] usuarios.json restaurado');
    await browser.close();
  }

  console.log('\n========================================');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log(`TOTAL: ${results.length} | PASS: ${pass} | FAIL: ${fail.length}`);
  if (fail.length) { console.log('\nFALLOS:'); fail.forEach(f => console.log(`  - ${f.name} ${f.detail ? ':: '+f.detail : ''}`)); }
})();
