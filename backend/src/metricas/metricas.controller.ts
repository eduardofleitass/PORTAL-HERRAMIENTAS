import { Controller, Get } from '@nestjs/common';
import { MetricasService } from './metricas.service.js';

@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get()
  getMetricas() {
    return this.metricasService.getMetricas();
  }
}
