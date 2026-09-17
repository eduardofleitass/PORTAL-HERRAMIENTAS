import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Interfaz que define la forma de una solucion/FAQ
export interface Solucion {
  id: number;
  pregunta: string;
  respuesta: string;
  modulo: string;
  categoria: string;
}

// DTO para crear (sin ID, se genera automaticamente)
export interface CreateSolucionDto {
  pregunta: string;
  respuesta: string;
  modulo: string;
  categoria: string;
}

// DTO para actualizar (todos opcionales)
export interface UpdateSolucionDto {
  pregunta?: string;
  respuesta?: string;
  modulo?: string;
  categoria?: string;
}

@Injectable()
export class SolucionesService {
  private readonly dataPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'soluciones.json',
    );
  }

  // Lee el archivo JSON
  private readFile(): Solucion[] {
    const rawData = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(rawData);
  }

  // Escribe el archivo JSON (persistir cambios)
  private writeFile(data: Solucion[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Genera el siguiente ID disponible
  private getNextId(soluciones: Solucion[]): number {
    if (soluciones.length === 0) return 1;
    const maxId = Math.max(...soluciones.map((s) => s.id));
    return maxId + 1;
  }

  // Devuelve todas las soluciones
  findAll(): Solucion[] {
    return this.readFile();
  }

  // Busca una solucion por ID
  findOne(id: number): Solucion | undefined {
    const todos = this.findAll();
    return todos.find((s) => s.id === id);
  }

  // Filtra por modulo (sin importar mayusculas/minusculas)
  findByModulo(modulo: string): Solucion[] {
    const todos = this.findAll();
    return todos.filter(
      (s) => s.modulo.toLowerCase() === modulo.toLowerCase(),
    );
  }

  // Filtra por categoria
  findByCategoria(categoria: string): Solucion[] {
    const todos = this.findAll();
    return todos.filter(
      (s) => s.categoria.toLowerCase() === categoria.toLowerCase(),
    );
  }

  // CREATE: agrega una nueva solucion al JSON
  create(dto: CreateSolucionDto): Solucion {
    const soluciones = this.readFile();
    const nuevaSolucion: Solucion = {
      id: this.getNextId(soluciones),
      ...dto,
    };
    soluciones.push(nuevaSolucion);
    this.writeFile(soluciones);
    return nuevaSolucion;
  }

  // UPDATE: modifica una solucion existente
  update(id: number, dto: UpdateSolucionDto): Solucion {
    const soluciones = this.readFile();
    const index = soluciones.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException(`Solucion con id ${id} no encontrada`);
    }

    soluciones[index] = { ...soluciones[index], ...dto };
    this.writeFile(soluciones);
    return soluciones[index];
  }

  // DELETE: elimina una solucion por ID
  delete(id: number): { message: string } {
    const soluciones = this.readFile();
    const index = soluciones.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException(`Solucion con id ${id} no encontrada`);
    }

    soluciones.splice(index, 1);
    this.writeFile(soluciones);
    return { message: `Solucion con id ${id} eliminada correctamente` };
  }
}
