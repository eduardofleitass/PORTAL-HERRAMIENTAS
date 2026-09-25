import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);

    if (decoded.rol !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden acceder a este recurso');
    }

    request.user = decoded;
    return true;
  }
}
