/**
 * Configuracion de la API del backend.
 *
 * El objetivo es que la misma build del frontend funcione en todos los
 * escenarios de despliegue:
 *
 *  1. Desarrollo con Vite        -> backend en localhost:3001 (puerto aparte)
 *  2. Electron empaquetado       -> backend en localhost:3001 (protocolo file://)
 *  3. Servidor / red local       -> mismo origen (el backend sirve el frontend)
 *  4. Backend en otro dominio    -> VITE_API_URL en build time
 *
 * Orden de resolucion:
 *  1. `VITE_API_URL` si esta definida (gana siempre)
 *  2. Si corremos en el servidor de desarrollo de Vite (`import.meta.env.DEV`),
 *     el backend esta en otro puerto de la misma maquina -> localhost:3001
 *  3. Si la pagina se sirve por http/https, el backend sirve el frontend
 *     -> mismo origen (vale para localhost, 192.168.x.x o un dominio)
 *  4. Fallback (Electron con file://): localhost:3001
 */

/** Puerto por defecto del backend en desarrollo y Electron */
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

  // 2. Servidor de desarrollo de Vite: el frontend corre en 5173+ y el
  //    backend aparte en 3001. Se detecta con la bandera de Vite, no
  //    adivinando el puerto (que puede variar si esta ocupado).
  if (import.meta.env?.DEV) {
    return origenLocal();
  }

  // 3. Servido por http/https: el backend sirve el frontend compilado,
  //    asi que el mismo origen es la respuesta correcta. Funciona igual
  //    en localhost, en una IP de red local o en un dominio con HTTPS.
  if (typeof window !== 'undefined') {
    const { protocol, origin } = window.location;
    if ((protocol === 'http:' || protocol === 'https:') && origin) {
      return origin;
    }
  }

  // 4. Electron empaquetado (file://) o cualquier otro caso
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
