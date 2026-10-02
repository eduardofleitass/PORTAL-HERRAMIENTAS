/**
 * Configuracion de la API del backend.
 *
 * El objetivo es que la misma build del frontend funcione en tres escenarios:
 *
 *  1. Desarrollo con Vite (localhost:5174)  -> backend en localhost:3001
 *  2. Electron empaquetado (file://)        -> backend en localhost:3001
 *  3. Desplegado como estatico en el mismo servidor -> mismo origen (relativo)
 *
 * Orden de resolucion:
 *  1. `VITE_API_URL` en build time  -> gana siempre si esta definida
 *  2. Si la pagina se sirve por http/https (no file://): usar el MISMO origen
 *     (el backend sirve el frontend en produccion, asi que no hace falta host)
 *  3. Fallback: localhost:3001 (desarrollo y Electron)
 */

/** Puerto por defecto del backend en desarrollo / Electron */
const PUERTO_LOCAL = '3001';

/** Origen del backend en desarrollo o Electron */
function origenLocal(): string {
  return `http://localhost:${PUERTO_LOCAL}`;
}

function resolverApiUrl(): string {
  // 1. Override explicito en build time
  const desdeEnv = import.meta.env?.VITE_API_URL;
  if (typeof desdeEnv === 'string' && desdeEnv.trim()) {
    return desdeEnv.trim().replace(/\/+$/, '');
  }

  // 2. Servido desde un servidor web (no file:// ni about:)
  //    El backend sirve el frontend, asi que el mismo origen alcanza.
  if (typeof window !== 'undefined') {
    const { protocol, origin } = window.location;
    if ((protocol === 'http:' || protocol === 'https:') && origin && !origin.includes(':5174')) {
      // En dev el frontend corre en Vite (5174) y el backend aparte,
      // por eso excluimos ese puerto para caer al fallback.
      return origin;
    }
  }

  // 3. Desarrollo (Vite) o Electron (file://)
  return origenLocal();
}

/** URL base del backend, sin barra final. Ej: "http://localhost:3001" */
export const API_URL = resolverApiUrl();

/**
 * Construye una URL absoluta del backend.
 *   api('/auth/login')   -> "http://localhost:3001/auth/login"
 *   api('/usuarios/3')   -> "http://localhost:3001/usuarios/3"
 */
export function api(ruta: string): string {
  const limpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${API_URL}${limpia}`;
}

/**
 * Resuelve la URL de un archivo subido que el backend guarda como ruta relativa.
 *   archivoUrl('uploads/avatars/x.jpg') -> "http://localhost:3001/uploads/avatars/x.jpg"
 *   archivoUrl('https://cdn/x.jpg')     -> "https://cdn/x.jpg"  (ya es absoluta)
 */
export function archivoUrl(ruta?: string): string {
  if (!ruta) return '';
  if (/^https?:\/\//i.test(ruta)) return ruta;
  return `${API_URL}/${ruta.replace(/^\/+/, '')}`;
}
