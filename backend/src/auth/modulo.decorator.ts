import { SetMetadata } from '@nestjs/common';

/** Clave de metadata para el modulo requerido */
export const MODULO_KEY = 'modulo_requerido';

/**
 * Decorador para proteger endpoints que pertenecen a un modulo.
 * Uso: @RequiereModulo('actividad')
 *
 * El ModuloGuard verifica que el usuario tenga permisos.modulos[modulo] === true.
 * Los admins pasan siempre.
 */
export const RequiereModulo = (modulo: string) => SetMetadata(MODULO_KEY, modulo);
