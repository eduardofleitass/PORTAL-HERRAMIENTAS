import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProcedimientosService, Procedimiento, CreateProcedimientoDto, UpdateProcedimientoDto } from './procedimientos.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

// @Controller('procedimientos') le dice a NestJS:
// "Todas las rutas de esta clase empiezan con /procedimientos"
@Controller('procedimientos')
export class ProcedimientosController {
  // Inyeccion de dependencias:
  // NestJS automaticamente crea una instancia de ProcedimientosService
  // y la pasa al constructor. No hace falta hacer "new ProcedimientosService()"
  constructor(private readonly procedimientosService: ProcedimientosService) {}

  // @Get() sin parametros = GET /procedimientos
  // Devuelve TODOS los procedimientos
  @Get()
  findAll(@Query('modulo') modulo?: string): Procedimiento[] {
    // Si viene ?modulo=Comisiones en la URL, filtra por modulo
    if (modulo) {
      return this.procedimientosService.findByModulo(modulo);
    }
    // Si no, devuelve todos
    return this.procedimientosService.findAll();
  }
  // POST /procedimientos/buscar
  // Recibe una consulta en lenguaje natural y devuelve procedimientos relevantes
  @Post('buscar')
  search(@Body() body: { q: string }): Procedimiento[] {
    // Si no viene nada en la consulta, devuelve un array vacio
    if (!body.q || body.q.trim() === '') {
      return [];
    }
    return this.procedimientosService.search(body.q);
  }

  // @Get(':id') = GET /procedimientos/1
  // Los dos puntos indican que es un parametro de la URL
  @Get(':id')
  findOne(@Param('id') id: string): Procedimiento | { statusCode: number; message: string } {
    // El parametro viene como string, lo convertimos a numero
    const procedimiento = this.procedimientosService.findOne(Number(id));
    
    // Si no existe, devolvemos un error 404 (Not Found)
    if (!procedimiento) {
      return { statusCode: 404, message: 'Procedimiento no encontrado' };
    }
    
    return procedimiento;
  }
  //Post: para crear procedimientos
  @Post()
  @UseGuards(AuthGuard,RolesGuard)
  @Roles('admin')
  create (@Body() dto: CreateProcedimientoDto): Procedimiento{
    return this.procedimientosService.create(dto);
  }

  // PATCH: editar un procedimiento
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcedimientoDto,
  ): Procedimiento {
    return this.procedimientosService.update(Number(id), dto);
  }

  // DELETE: eliminar un procedimiento
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string): { message: string } {
    return this.procedimientosService.delete(Number(id));
  }
}
