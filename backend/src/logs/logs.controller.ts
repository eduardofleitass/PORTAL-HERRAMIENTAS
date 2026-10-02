import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll() {
    return this.logsService.findAll();
  }

  @Get('resumen')
  getResumen() {
    return this.logsService.getResumen();
  }

  @Delete()
  clear() {
    return this.logsService.clear();
  }
}
