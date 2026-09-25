import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, AuthService, AdminGuard],
})
export class UsuariosModule {}
