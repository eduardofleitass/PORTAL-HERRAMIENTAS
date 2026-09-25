import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentacionService } from "./documentacion.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";

@Controller("documentacion")
export class DocumentacionController {
  constructor(private readonly documentacionService: DocumentacionService) {}

  @Get()
  findAll(@Query("seccion") seccion?: string) {
    if (seccion) {
      return this.documentacionService.findBySeccion(seccion);
    }
    return this.documentacionService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    const doc = this.documentacionService.findOne(Number(id));
    if (!doc) {
      return { statusCode: 404, message: "Documento no encontrado" };
    }
    return doc;
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @UseInterceptors(FileInterceptor("archivo"))
  create(
    @UploadedFile() archivo: { buffer: Buffer; originalname: string; size: number; mimetype: string },
    @Body() body: { titulo: string; descripcion: string; seccion: string }
  ) {
    if (!archivo) {
      throw new BadRequestException("Debe subir un archivo");
    }
    if (!body.titulo || !body.seccion) {
      throw new BadRequestException("Titulo y seccion son requeridos");
    }

    return this.documentacionService.create(
      { titulo: body.titulo, descripcion: body.descripcion || "", seccion: body.seccion },
      archivo.buffer,
      archivo.originalname
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  delete(@Param("id") id: string) {
    return this.documentacionService.delete(Number(id));
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  update(
    @Param("id") id: string,
    @Body() body: { titulo: string; descripcion: string; seccion: string }
  ) {
    return this.documentacionService.update(Number(id), body);
  }
}
