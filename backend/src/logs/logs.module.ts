import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller.js';
import { ErroresFrontendController } from './errores-frontend.controller.js';
import { LogsService } from './logs.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [LogsController, ErroresFrontendController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
