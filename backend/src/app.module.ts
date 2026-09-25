import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProcedimientosModule } from './procedimientos/procedimientos.module.js';
import { ErroresModule } from './errores/errores.module.js';
import { ConfiguracionModule } from './configuracion/configuracion.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DocumentacionModule } from './documentacion/documentacion.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { MetricasModule } from './metricas/metricas.module.js';

@Module({
  imports: [ProcedimientosModule,ErroresModule,ConfiguracionModule,AuthModule,DocumentacionModule,MetricasModule,UsuariosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
