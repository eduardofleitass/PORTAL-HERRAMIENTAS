import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  // canActivate decide si la peticion puede continuar o no
  canActivate(context: ExecutionContext): boolean {
    // Obtenemos el objeto request de la peticion HTTP
    const request = context.switchToHttp().getRequest();

    // Leemos el header "Authorization"
    const authHeader = request.headers['authorization'];

    // Si no viene el header o no empieza con "Bearer ", rechazamos
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Extraemos el token (todo despues de "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
      // Verificamos el token con AuthService
      const payload = this.authService.verifyToken(token);
      // Verificamos que el usuario siga activo
      if (!this.authService.isUserActive(payload.sub)) {
        throw new UnauthorizedException('Usuario inhabilitado');
      }
      // Guardamos los datos del usuario en la request para que el controller los use
      request.user = payload;
      return true; // Permite el acceso
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }
}