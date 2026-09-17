import { Controller, Get, Param, Query, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { SolucionesService, Solucion, CreateSolucionDto, UpdateSolucionDto } from './soluciones.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('soluciones')
export class SolucionesController {
  constructor(private readonly solucionesService: SolucionesService) {}

  // GET publico: todas las soluciones
  @Get()
  findAll(
    @Query('modulo') modulo?: string,
    @Query('categoria') categoria?: string,
  ): Solucion[] {
    let resultado = this.solucionesService.findAll();
    if (modulo) {
      resultado = resultado.filter(
        (s) => s.modulo.toLowerCase() === modulo.toLowerCase(),
      );
    }
    if (categoria) {
      resultado = resultado.filter(
        (s) => s.categoria.toLowerCase() === categoria.toLowerCase(),
      );
    }
    return resultado;
  }

  // GET publico: ver una solucion por ID
  @Get(':id')
  findOne(@Param('id') id: string): Solucion | { statusCode: number; message: string } {
    const solucion = this.solucionesService.findOne(Number(id));
    if (!solucion) {
      return { statusCode: 404, message: 'Solucion no encontrada' };
    }
    return solucion;
  }

  // POST protegido: solo ADMIN puede crear soluciones
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateSolucionDto): Solucion {
    return this.solucionesService.create(dto);
  }

  // PATCH protegido: solo ADMIN puede editar
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSolucionDto,
  ): Solucion {
    return this.solucionesService.update(Number(id), dto);
  }

  // DELETE protegido: solo ADMIN puede eliminar
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string): { message: string } {
    return this.solucionesService.delete(Number(id));
  }
}
