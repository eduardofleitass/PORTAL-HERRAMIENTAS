import { Controller, Post, Body, Patch, UploadedFile, UseInterceptors, Req, Get, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AuthService } from './auth.service.js';

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
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(@Body() credenciales: LoginDto){
        if (!credenciales.username || !credenciales.password){
            throw new UnauthorizedException('Username y password son requeridos');
        }
        return this.authService.login(credenciales.username, credenciales.password)
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
            path.join(__dirname, '..', '..', 'data', 'usuarios.json'), 'utf-8'
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
