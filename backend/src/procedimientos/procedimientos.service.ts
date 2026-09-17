import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Interfaz: define la forma que tienen los datos
export interface Paso {
  orden: number;
  descripcion: string;
}

export interface Procedimiento {
  id: number;
  titulo: string;
  pasos: Paso[];
  modulo: string;
  nivel: string;
  tiempo_estimado: string;
}

// DTO para crear (sin ID, se genera automaticamente)
export interface CreateProcedimientoDto {
  titulo: string;
  pasos: Paso[];
  modulo: string;
  nivel: string;
  tiempo_estimado: string;
}

// DTO para actualizar (todos opcionales)
export interface UpdateProcedimientoDto {
  titulo?: string;
  pasos?: Paso[];
  modulo?: string;
  nivel?: string;
  tiempo_estimado?: string;
}

@Injectable()
export class ProcedimientosService {
  private readonly dataPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'procedimientos.json'
    );
  }

  // Lee el archivo JSON
  private readFile(): Procedimiento[] {
    const rawData = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(rawData);
  }

  // Escribe el archivo JSON (persistir cambios)
  private writeFile(data: Procedimiento[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Genera el siguiente ID disponible
  private getNextId(procedimientos: Procedimiento[]): number {
    if (procedimientos.length === 0) return 1;
    const maxId = Math.max(...procedimientos.map((p) => p.id));
    return maxId + 1;
  }

  // Devuelve todos los procedimientos
  findAll(): Procedimiento[] {
    return this.readFile();
  }

  // Busca un procedimiento por ID
  findOne(id: number): Procedimiento | undefined {
    const todos = this.findAll();
    return todos.find((p) => p.id === id);
  }

  // Filtra por modulo (sin importar mayusculas/minusculas)
  findByModulo(modulo: string): Procedimiento[] {
    const todos = this.findAll();
    return todos.filter(
      (p) => p.modulo.toLowerCase() === modulo.toLowerCase()
    );
  }

  // CREATE: agrega un nuevo procedimiento al JSON
  create(dto: CreateProcedimientoDto): Procedimiento {
    const procedimientos = this.readFile();
    const nuevoprocedimiento: Procedimiento = {
      id: this.getNextId(procedimientos),
      ...dto,
    };
    procedimientos.push(nuevoprocedimiento);
    this.writeFile(procedimientos);
    return nuevoprocedimiento;
  }

  // UPDATE: modifica un procedimiento existente
  update(id: number, dto: UpdateProcedimientoDto): Procedimiento {
    const procedimientos = this.readFile();
    const index = procedimientos.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new NotFoundException(`Procedimiento con id ${id} no encontrado`);
    }

    // Merge: conservamos lo existente y sobrescribimos con lo nuevo
    procedimientos[index] = { ...procedimientos[index], ...dto };
    this.writeFile(procedimientos);
    return procedimientos[index];
  }

  // DELETE: elimina un procedimiento por ID
  delete(id: number): { message: string } {
    const procedimientos = this.readFile();
    const index = procedimientos.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new NotFoundException(`Procedimiento con id ${id} no encontrado`);
    }

    procedimientos.splice(index, 1);
    this.writeFile(procedimientos);
    return { message: `Procedimiento con id ${id} eliminado correctamente` };
  }
}
