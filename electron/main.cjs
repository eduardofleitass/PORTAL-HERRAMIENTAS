const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const isDev = !app.isPackaged;
const PORT = 3001;
const DEBUG = process.env.PORTAL_DEBUG === '1';

// --- Logging a archivo -------------------------------------------------------
let logFile = null;
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    if (!logFile) {
      logFile = path.join(app.getPath('userData'), 'electron-debug.log');
    }
    fs.appendFileSync(logFile, line);
  } catch (e) { /* ignorar */ }
  if (DEBUG) console.log(msg);
}

let mainWindow;
let backendProcess;

// --- Ventana -----------------------------------------------------------------
function createWindow() {
  log('Creando ventana...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#0b0f19',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Portal de Herramientas',
  });

  // localhost (no 127.0.0.1) para coincidir con las URLs del frontend y el CORS.
  const loadUrl = `http://localhost:${PORT}`;
  log(`Cargando URL: ${loadUrl}`);
  mainWindow.loadURL(loadUrl);

  if (DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log('Ventana mostrada');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Error cargando pagina: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    log(`[Console ${level}] ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Pagina cargada exitosamente');
  });

  mainWindow.on('closed', () => {
    log('Ventana cerrada');
    mainWindow = null;
  });
}

// --- Rutas -------------------------------------------------------------------
function getBackendBasePath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend');
  }
  return path.join(process.resourcesPath, 'backend');
}

function ensureUserData() {
  const userData = app.getPath('userData');
  const dataDest = path.join(userData, 'data');

  if (!fs.existsSync(dataDest)) {
    fs.mkdirSync(dataDest, { recursive: true });
  }

  // En produccion, sembrar los JSON por defecto si el usuario aun no tiene datos.
  if (!isDev) {
    const sourceData = path.join(process.resourcesPath, 'backend', 'data');
    if (fs.existsSync(sourceData)) {
      for (const file of fs.readdirSync(sourceData)) {
        const srcFile = path.join(sourceData, file);
        const destFile = path.join(dataDest, file);
        try {
          if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        } catch (e) {
          log(`No se pudo sembrar ${file}: ${e.message}`);
        }
      }
    }
  }

  return dataDest;
}

/**
 * Resuelve el runtime de Node a usar para el backend.
 * En produccion usamos el propio binario de Electron en modo Node
 * (ELECTRON_RUN_AS_NODE=1), asi el usuario NO necesita tener Node.js instalado.
 * Si eso falla, caemos a un node.exe del sistema.
 */
function resolveNodeRuntime() {
  if (process.env.PORTAL_FORCE_SYSTEM_NODE === '1') {
    return { bin: findSystemNode(), runAsNode: false };
  }
  // process.execPath = el .exe de Electron empaquetado
  return { bin: process.execPath, runAsNode: true };
}

function findSystemNode() {
  const candidates = [
    path.join('C:', 'Program Files', 'nodejs', 'node.exe'),
    path.join('C:', 'Program Files (x86)', 'nodejs', 'node.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return 'node';
}

// --- Esperar al backend ------------------------------------------------------
function waitForBackend(maxAttempts = 45, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function tryConnect() {
      attempts++;
      const req = http.get(`http://localhost:${PORT}/`, (res) => {
        res.resume();
        log(`Backend responde: ${res.statusCode} (intento ${attempts})`);
        resolve();
      });
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Backend no responde tras ${maxAttempts} intentos: ${err.message}`));
        } else {
          setTimeout(tryConnect, interval);
        }
      });
      req.setTimeout(4000, () => req.destroy());
    }
    tryConnect();
  });
}

// --- Arranque del backend ----------------------------------------------------
function startBackend() {
  if (isDev) {
    log('Modo desarrollo - abriendo ventana (backend lo levanta el dev server)');
    createWindow();
    return;
  }

  log('Modo produccion - iniciando backend...');
  const basePath = getBackendBasePath();
  const userDataPath = ensureUserData();
  const mainJsPath = path.join(basePath, 'dist', 'main.js');

  const { bin, runAsNode } = resolveNodeRuntime();
  log(`Runtime: ${bin} (runAsNode=${runAsNode})`);
  log(`Backend cwd: ${basePath}`);
  log(`main.js: ${mainJsPath} (existe=${fs.existsSync(mainJsPath)})`);
  log(`Data: ${userDataPath}`);

  // NOTA: nunca usar shell:true — las rutas con espacios ("Proyecto Soporte")
  // se cortan y el backend muere con codigo 1.
  backendProcess = spawn(bin, [mainJsPath], {
    cwd: basePath,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      ...(runAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      NODE_ENV: 'production',
      PORT: String(PORT),
      PORTAL_DATA_PATH: userDataPath,
      PORTAL_FRONTEND_DIST: path.join(process.resourcesPath, 'frontend', 'dist'),
    },
  });

  const backendLogFile = path.join(app.getPath('userData'), 'backend-error.log');
  const appendBackendLog = (prefix, data) => {
    try { fs.appendFileSync(backendLogFile, `[${prefix}] ${data}`); } catch (e) {}
  };

  backendProcess.stdout.on('data', (d) => appendBackendLog('STDOUT', d));
  backendProcess.stderr.on('data', (d) => appendBackendLog('STDERR', d));
  backendProcess.on('error', (err) => {
    log(`Error al iniciar el backend: ${err.message}`);
    appendBackendLog('ERROR', `${err.message}\n`);
  });
  backendProcess.on('exit', (code) => {
    log(`Backend salio con codigo: ${code}`);
    appendBackendLog('EXIT', `codigo ${code}\n`);
  });

  log(`Esperando backend en puerto ${PORT}...`);
  waitForBackend()
    .then(() => {
      log('Backend listo - abriendo ventana');
      createWindow();
    })
    .catch((err) => {
      log(`Error esperando backend: ${err.message}`);
      createWindow(); // abrir igual para que el usuario vea el error
    });
}

// --- Ciclo de vida -----------------------------------------------------------
app.whenReady().then(() => {
  log('=== App iniciada ===');
  startBackend();
});

app.on('window-all-closed', () => {
  log('Todas las ventanas cerradas');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
