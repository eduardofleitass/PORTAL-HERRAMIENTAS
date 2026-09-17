import { Module } from '@nestjs/common';
import { ProcedimientosController } from './procedimientos.controller.js';
import { ProcedimientosService } from './procedimientos.service.js';
import { AuthModule } from '../auth/auth.module.js';

// @Module es un decorador que le dice a NestJS como organizar este modulo
@Module({
  imports: [AuthModule],
  // controllers: lista de controladores que manejan rutas HTTP
  controllers: [ProcedimientosController],
  
  // providers: lista de servicios que pueden ser inyectados
  providers: [ProcedimientosService],
})
export class ProcedimientosModule {}
