import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getDataPath } from './data-path.js';

/**
 * Configuracion central por variables de entorno, con valores por defecto
 * seguros para desarrollo local.
 *
 * En produccion se deben definir al menos JWT_SECRET y NODE_ENV=production.
 */

/** Lee una variable de entorno, o devuelve el default */
function env(nombre: string, porDefecto: string): string {
  const v = process.env[nombre];
  return v && v.trim() ? v.trim() : porDefecto;
}

/**
 * Resuelve el secreto JWT.
 *
 * Orden de preferencia:
 *  1. Variable de entorno JWT_SECRET (recomendado en produccion)
 *  2. Archivo .jwt-secret persistido junto a los datos (generado la primera vez)
 *
 * Nunca usa un valor hardcodeado en el codigo: si no hay entorno ni archivo,
 * genera uno aleatorio fuerte y lo persiste, de modo que los tokens sobrevivan
 * a un reinicio del servidor.
 */
function resolverJwtSecret(): { secret: string; fuente: string } {
  const desdeEntorno = process.env.JWT_SECRET;
  if (desdeEntorno && desdeEntorno.trim().length >= 32) {
    return { secret: desdeEntorno.trim(), fuente: 'variable de entorno JWT_SECRET' };
  }
  if (desdeEntorno && desdeEntorno.trim()) {
    console.warn('[config] JWT_SECRET es demasiado corto (minimo 32 caracteres). Se ignora y se genera uno persistido.');
  }

  const ruta = path.join(path.dirname(getDataPath('usuarios.json')), '.jwt-secret');
  try {
    if (fs.existsSync(ruta)) {
      const guardado = fs.readFileSync(ruta, 'utf-8').trim();
      if (guardado.length >= 32) {
        return { secret: guardado, fuente: 'archivo data/.jwt-secret' };
      }
    }
    const nuevo = crypto.randomBytes(48).toString('base64url');
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, nuevo, { encoding: 'utf-8', mode: 0o600 });
    console.warn('[config] JWT_SECRET no definido: generado y guardado en data/.jwt-secret');
    return { secret: nuevo, fuente: 'archivo data/.jwt-secret (recien generado)' };
  } catch (err) {
    // Ultimo recurso: secreto efimero (los tokens se invalidan al reiniciar)
    console.error('[config] No se pudo persistir el secreto JWT:', err);
    return { secret: crypto.randomBytes(48).toString('base64url'), fuente: 'efimero (no persistido)' };
  }
}

const jwt = resolverJwtSecret();

export const CONFIG = {
  /** Puerto del servidor */
  puerto: Number(env('PORT', '3001')),

  /** Entorno de ejecucion */
  esProduccion: env('NODE_ENV', 'development') === 'production',

  /** Secreto para firmar JWT */
  jwtSecret: jwt.secret,
  jwtSecretFuente: jwt.fuente,

  /** Duracion del token (ventana de inactividad con sesion deslizante) */
  tokenTtl: env('TOKEN_TTL', '3m'),

  /** Directorio del frontend compilado (para servir en produccion) */
  frontendDist: env('PORTAL_FRONTEND_DIST', ''),

  /** Origenes permitidos por CORS. Vacio = defaults de desarrollo local. */
  corsOrigins: env('CORS_ORIGINS', ''),

  /** Limite de intentos de login por IP en la ventana */
  loginMaxIntentos: Number(env('LOGIN_MAX_INTENTOS', '5')),

  /** Ventana de tiempo para el limite de intentos (segundos) */
  loginVentanaSeg: Number(env('LOGIN_VENTANA_SEG', '60')),
};

/**
 * Valida la configuracion al arrancar y avisa de riesgos.
 * No aborta el arranque: solo advierte, para no romper desarrollo local.
 */
export function validarConfig(): void {
  const avisos: string[] = [];

  if (CONFIG.esProduccion) {
    if (CONFIG.jwtSecretFuente !== 'variable de entorno JWT_SECRET') {
      avisos.push('JWT_SECRET deberia definirse como variable de entorno en produccion.');
    }
    if (!CONFIG.corsOrigins) {
      avisos.push('CORS_ORIGINS no definido: se permiten solo origenes locales.');
    }
  }

  if (avisos.length) {
    console.warn('\n[config] Avisos de configuracion:');
    avisos.forEach((a) => console.warn(`  - ${a}`));
    console.warn('');
  }

  console.log(`[config] Puerto: ${CONFIG.puerto} | Entorno: ${CONFIG.esProduccion ? 'produccion' : 'desarrollo'}`);
  console.log(`[config] JWT secret: ${CONFIG.jwtSecretFuente}`);
  console.log(`[config] Limite de login: ${CONFIG.loginMaxIntentos} intentos / ${CONFIG.loginVentanaSeg}s por IP`);
}
