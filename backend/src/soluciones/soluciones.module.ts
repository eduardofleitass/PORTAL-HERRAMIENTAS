import { Module } from '@nestjs/common';
import { SolucionesController } from './soluciones.controller.js';
import { SolucionesService } from './soluciones.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [SolucionesController],
  providers: [SolucionesService],
})
export class SolucionesModule {}
