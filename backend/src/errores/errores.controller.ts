import {Controller,Get,Post,Patch,Delete, Param, Query, Body,UseGuards,} from "@nestjs/common";
import { ErroresService, Error, CreateErrorDto, UpdateErrorDto } from "./errores.service.js";
import { AuthGuard } from '../auth/auth.guard.js';
import { PermisoGuard } from '../auth/permiso.guard.js';
import { RequierePermiso } from '../auth/permiso.decorator.js';

// @UseGuards a nivel de controller: todas las rutas requieren login
// pero los GET los dejamos publicos para que cualquiera pueda consultar
@Controller('errores')
export class ErroresController {
    constructor(private readonly erroresService: ErroresService) {}

    // GET publico: cualquiera puede ver los errores
    @Get()
    findAll(
        @Query('modulo') modulo?: string,
        @Query('frecuencia') frecuencia?: string,
    ): Error[] {
        let resultado = this.erroresService.findAll();
        if (modulo) {
            resultado = resultado.filter(
                (e) => e.modulo_afectado.toLocaleLowerCase() === modulo.toLocaleLowerCase(),
            );
        }
        if (frecuencia) {
            resultado = resultado.filter(
                (e) => e.frecuencia.toLocaleLowerCase() === frecuencia.toLocaleLowerCase(),
            );
        }
        return resultado;
    }

    // GET publico: ver un error por ID
    @Get(':id')
    findOne(@Param('id') id: string): Error | { statusCode: number; message: string } {
        const error = this.erroresService.findOne(Number(id));
        if (!error) {
            return { statusCode: 404, message: 'Error no encontrado' };
        }
        return error;
    }

    // POST protegido: requiere permiso 'crear'
    @Post()
    @UseGuards(AuthGuard, PermisoGuard)
    @RequierePermiso('crear')
    create(@Body() dto: CreateErrorDto): Error {
        return this.erroresService.create(dto);
    }

    // PATCH protegido: requiere permiso 'editar'
    @Patch(':id')
    @UseGuards(AuthGuard, PermisoGuard)
    @RequierePermiso('editar')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateErrorDto,
    ): Error {
        return this.erroresService.update(Number(id), dto);
    }

    // DELETE protegido: requiere permiso 'eliminar'
    @Delete(':id')
    @UseGuards(AuthGuard, PermisoGuard)
    @RequierePermiso('eliminar')
    delete(@Param('id') id: string): { message: string } {
        return this.erroresService.delete(Number(id));
    }
}