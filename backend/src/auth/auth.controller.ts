import { Controller, Post, Body, Patch, UploadedFile, UseInterceptors, Req, Get, UnauthorizedException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AuthService } from './auth.service.js';
import { LoginThrottleGuard } from './login-throttle.guard.js';
import { getDataPath } from '../data-path.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarStorage = diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

interface LoginDto{
    username: string;
    password: string;
}

@Controller('auth')
export class AuthController{
    constructor(
        private readonly authService: AuthService,
        private readonly throttle: LoginThrottleGuard,
    ) {}

    @Post('login')
    @UseGuards(LoginThrottleGuard)
    login(@Body() credenciales: LoginDto, @Req() req: Request){
        if (!credenciales.username || !credenciales.password){
            throw new UnauthorizedException('Username y password son requeridos');
        }
        const ip = this.obtenerIp(req);
        try {
            const resultado = this.authService.login(credenciales.username, credenciales.password);
            // Login correcto: limpiar el contador de intentos de esta IP
            this.throttle.limpiar(ip);
            return resultado;
        } catch (err) {
            // Login fallido: sumar un intento adicional al contador
            this.throttle.registrarFallo(ip);
            throw err;
        }
    }

    /** Extrae la IP del cliente (respeta X-Forwarded-For detras de un proxy) */
    private obtenerIp(req: any): string {
        const fwd = req.headers?.['x-forwarded-for'];
        if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
        return req.ip ?? req.socket?.remoteAddress ?? 'desconocida';
    }

    // POST /auth/refresh - renueva el token (sesion deslizante).
    // Requiere un token aun valido; extiende la sesion mientras haya actividad.
    @Post('refresh')
    refresh(@Req() req: Request) {
        const authHeader = (req.headers as any)['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Token requerido');
        }
        const token = authHeader.replace('Bearer ', '');
        return this.authService.refresh(token);
    }

    // GET /auth/me - devuelve datos del usuario logueado (incluye avatar actualizado)
    @Get('me')
    getMe(@Req() req: Request) {
        const authHeader = (req.headers as any)['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Token requerido');
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = this.authService.verifyToken(token);
        const raw = fs.readFileSync(
            getDataPath('usuarios.json'), 'utf-8'
        );
        const all = JSON.parse(raw);
        const user = all.find((u: any) => u.id === decoded.sub);
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }
        const { password, ...rest } = user;
        return rest;
    }

    // PATCH /auth/me/avatar - cualquier usuario puede subir su propio avatar
    @Patch('me/avatar')
    @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage }))
    updateMyAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            return { message: 'No se subio ninguna imagen' };
        }
        const authHeader = (req.headers as any)['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Token requerido');
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = this.authService.verifyToken(token);

        const relPath = path.relative(
            path.join(__dirname, '..', '..'),
            file.path
        ).replace(/\\\\/g, '/');

        const user = this.authService.updateAvatar(decoded.sub, relPath);
        if (!user) {
            return { message: 'Usuario no encontrado' };
        }
        return user;
    }
}
