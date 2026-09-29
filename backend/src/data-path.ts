import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Normaliza rutas que puedan venir en formato MSYS/Cygwin en Windows.
 * Convierte /c/Users/... -> C:\Users\...
 * La variable PORTAL_DATA_PATH puede venir con barras tipo Unix incluso en Windows.
 */
function normalizeMsysPath(inputPath: string): string {
  if (process.platform !== 'win32') {
    return inputPath;
  }

  // Detectar formato MSYS: /c/Users/... -> C:\Users\...
  // Tambien funciona para /C/Users/...
  const msysMatch = inputPath.match(/^\/[a-zA-Z]\/(.+)/);
  if (msysMatch) {
    const driveLetter = inputPath.charAt(1).toUpperCase();
    return `${driveLetter}:\\${msysMatch[1].replace(/\//g, '\\')}`;
  }

  // Si ya es ruta Windows, solo asegurar barras correctas
  return inputPath.replace(/\//g, '\\');
}

/**
 * Devuelve la ruta absoluta a un archivo JSON dentro de la carpeta de datos.
 * Si la app corre empaquetada (Electron), usa PORTAL_DATA_PATH.
 * Si corre en desarrollo, usa la carpeta 'data' al lado del codigo.
 */
export function getDataPath(filename: string): string {
  const userDataPath = process.env.PORTAL_DATA_PATH;
  if (userDataPath) {
    const normalized = normalizeMsysPath(userDataPath);
    return path.join(normalized, filename);
  }

  // Fallback para desarrollo
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..', '..', 'data', filename);
}
