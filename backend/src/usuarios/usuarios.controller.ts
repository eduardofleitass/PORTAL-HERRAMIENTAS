import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { UsuariosService, CrearUsuarioDto } from './usuarios.service.js';
import { AdminGuard } from '../auth/admin.guard.js';

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

@Controller('usuarios')
@UseGuards(AdminGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  getAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    const user = this.usuariosService.findOne(Number(id));
    if (!user) {
      return { message: 'Usuario no encontrado' };
    }
    return user;
  }

  @Post()
  create(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CrearUsuarioDto>) {
    const user = this.usuariosService.update(Number(id), dto);
    if (!user) {
      return { message: 'Usuario no encontrado' };
    }
    return user;
  }

  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage }))
  updateAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { message: 'No se subio ninguna imagen' };
    }
    // El path que multer guarda incluye 'uploads/avatars/filename'
    const relPath = path.relative(
      path.join(__dirname, '..', '..'),
      file.path
    ).replace(/\\/g, '/');
    const user = this.usuariosService.updateAvatar(Number(id), relPath);
    if (!user) {
      return { message: 'Usuario no encontrado' };
    }
    return user;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const ok = this.usuariosService.remove(Number(id));
    return { success: ok, message: ok ? 'Eliminado correctamente' : 'Usuario no encontrado' };
  }
}
