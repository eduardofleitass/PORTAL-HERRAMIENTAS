import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { MODULO_KEY } from './modulo.decorator.js';

/**
 * Guard que valida acceso a un MODULO completo (no una accion puntual).
 * Se usa con @RequiereModulo('actividad'), @RequiereModulo('usuarios'), etc.
 *
 * Reglas:
 * - Sin @RequiereModulo() => permite (el guard no aplica)
 * - Admin => siempre permite
 * - Usuario => requiere permisos.modulos[modulo] === true
 *
 * EXCEPCION "propio usuario":
 * Si el modulo es 'usuarios' y el param :id coincide con el id del usuario
 * autenticado, se permite (para que pueda editar su propio perfil/avatar).
 */
@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const moduloRequerido = this.reflector.getAllAndOverride<string>(MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduloRequerido) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user || !user.sub) {
      throw new ForbiddenException('Sesion invalida');
    }

    // Admins tienen acceso a todos los modulos
    if (user.rol === 'admin') {
      return true;
    }

    // Excepcion: un usuario puede operar sobre SU PROPIO id en el modulo usuarios
    // (necesario para /perfil -> PATCH /usuarios/:id y /usuarios/:id/avatar)
    const paramId = Number(request.params?.id);
    if (moduloRequerido === 'usuarios' && !Number.isNaN(paramId) && paramId === Number(user.sub)) {
      return true;
    }

    const usuario = this.authService.findById(user.sub);
    if (!usuario) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    if (!usuario.permisos || !usuario.permisos.modulos) {
      throw new ForbiddenException('No tenes acceso a este modulo');
    }

    if (usuario.permisos.modulos[moduloRequerido] !== true) {
      throw new ForbiddenException('No tenes acceso a este modulo');
    }

    return true;
  }
}
