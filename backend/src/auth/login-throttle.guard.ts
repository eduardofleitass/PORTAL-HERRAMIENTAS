import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { CONFIG } from '../config.js';

/**
 * Rate limiting simple en memoria para el endpoint de login.
 *
 * Limita los intentos por IP dentro de una ventana de tiempo. Es suficiente
 * para un portal interno de un solo proceso; si algun dia se escala a varias
 * instancias, habria que mover el contador a un almacen compartido (Redis).
 *
 * Se aplica con @UseGuards(LoginThrottleGuard) sobre POST /auth/login.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  /** IP -> timestamps de intentos recientes */
  private readonly intentos = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip = this.obtenerIp(req);
    const ahora = Date.now();
    const ventanaMs = CONFIG.loginVentanaSeg * 1000;

    // Limpiar intentos fuera de la ventana
    const previos = (this.intentos.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);

    if (previos.length >= CONFIG.loginMaxIntentos) {
      const masAntiguo = previos[0];
      const esperaS = Math.max(1, Math.ceil((ventanaMs - (ahora - masAntiguo)) / 1000));
      this.intentos.set(ip, previos);
      throw new HttpException(
        `Demasiados intentos de inicio de sesion. Espere ${esperaS} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    previos.push(ahora);
    this.intentos.set(ip, previos);

    // Poda periodica para no crecer sin limite
    if (this.intentos.size > 5000) {
      for (const [k, v] of this.intentos) {
        const vivos = v.filter((t) => ahora - t < ventanaMs);
        if (vivos.length === 0) this.intentos.delete(k);
        else this.intentos.set(k, vivos);
      }
    }

    return true;
  }

  /** Cuenta los intentos fallidos de una IP (llamado tras un login invalido) */
  registrarFallo(ip: string): void {
    const previos = this.intentos.get(ip) ?? [];
    previos.push(Date.now());
    this.intentos.set(ip, previos);
  }

  /** Limpia el historial de una IP (llamado tras un login exitoso) */
  limpiar(ip: string): void {
    this.intentos.delete(ip);
  }

  private obtenerIp(req: any): string {
    const fwd = req.headers?.['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
    return req.ip ?? req.socket?.remoteAddress ?? 'desconocida';
  }
}
