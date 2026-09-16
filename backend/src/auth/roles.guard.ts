import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector permite leer metadata de los decoradores
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Leemos que roles estan requeridos para esta ruta
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),    // El metodo del controller
      context.getClass(),      // La clase del controller
    ]);

    // Si no hay @Roles() definido, permite el acceso
    if (!requiredRoles) {
      return true;
    }

    // Obtenemos el usuario del request (lo puso AuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Si el usuario no tiene el rol requerido, rechazamos con 403
    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    return true;
  }
}
