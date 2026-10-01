import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { PERMISO_KEY } from './permiso.decorator.js';

export interface PermisosUsuario {
  modulos: Record<string, boolean>;
  acciones: Record<string, boolean>;
}

@Injectable()
export class PermisoGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay @RequierePermiso(), permite
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.sub) {
      throw new ForbiddenException('Sesion invalida');
    }

    // Admins tienen todos los permisos
    if (user.rol === 'admin') {
      return true;
    }

    // Buscar el usuario completo en el JSON para obtener permisos
    const usuario = this.authService.findById(user.sub);
    if (!usuario) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Si no tiene campo permisos, no tiene acceso (solo admin)
    if (!usuario.permisos || !usuario.permisos.acciones) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    // Verificar la accion requerida
    if (!usuario.permisos.acciones[requiredPermission]) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    return true;
  }
}
