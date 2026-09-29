/**
 * Hook afterPack de electron-builder.
 *
 * electron-builder NO incluye backend/node_modules en extraResources (los
 * excluye por defecto). Sin esas dependencias el backend NestJS muere al
 * instante con exit code 1 y la app queda en blanco.
 *
 * Este hook copia backend/node_modules a resources/backend/node_modules
 * de forma automatica en cada build, para que `npm run dist` sea reproducible
 * y no requiera un `cp -r` manual posterior.
 */
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const projectDir = context.packager.projectDir;

  const source = path.join(projectDir, 'backend', 'node_modules');
  const dest = path.join(appOutDir, 'resources', 'backend', 'node_modules');

  if (!fs.existsSync(source)) {
    console.warn('[afterPack] backend/node_modules no existe — se omite la copia.');
    return;
  }

  // Verificar que el backend se haya copiado primero
  const backendDest = path.join(appOutDir, 'resources', 'backend');
  if (!fs.existsSync(backendDest)) {
    console.warn('[afterPack] resources/backend no existe — revisar extraResources.');
    return;
  }

  console.log(`[afterPack] Copiando node_modules del backend -> ${dest}`);
  fs.cpSync(source, dest, {
    recursive: true,
    force: true,
    dereference: false,
    filter: (src) => {
      // Evitar copiar .bin (shims de shell, no necesarios en runtime)
      const rel = path.relative(source, src);
      return !rel.startsWith('.bin');
    },
  });

  const count = fs.readdirSync(dest).length;
  console.log(`[afterPack] node_modules copiado (${count} paquetes de primer nivel).`);
};
