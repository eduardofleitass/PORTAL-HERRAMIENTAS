import { Injectable, NotFoundException } from "@nestjs/common";
import * as fs from 'fs';
import { fileURLToPath } from "url";
import * as path from 'path';

export interface Error {
    id: number;
    codigo: string;
    titulo: string;
    descripcion: string;
    causa: string;
    solucion: string;
    modulo_afectado: string;
    frecuencia: string;
    tags: string[];
}

// DTO para crear un error (sin ID, se genera automaticamente)
export interface CreateErrorDto {
    codigo: string;
    titulo: string;
    descripcion: string;
    causa: string;
    solucion: string;
    modulo_afectado: string;
    frecuencia: string;
    tags: string[];
}

// DTO para actualizar (todos los campos son opcionales)
export interface UpdateErrorDto {
    codigo?: string;
    titulo?: string;
    descripcion?: string;
    causa?: string;
    solucion?: string;
    modulo_afectado?: string;
    frecuencia?: string;
    tags?: string[];
}

@Injectable()
export class ErroresService {
    private readonly dataPath: string;

    constructor() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.dataPath = path.join(__dirname, '..', '..', 'data', 'errores.json');
    }

    // Lee el archivo JSON
    private readFile(): Error[] {
        const rawData = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(rawData);
    }

    // Escribe el archivo JSON (para persistir cambios)
    private writeFile(data: Error[]): void {
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    }

    // Genera el siguiente ID disponible
    private getNextId(errores: Error[]): number {
        if (errores.length === 0) return 1;
        const maxId = Math.max(...errores.map((e) => e.id));
        return maxId + 1;
    }

    findAll(): Error[] {
        return this.readFile();
    }

    findOne(id: number): Error | undefined {
        const todos = this.findAll();
        return todos.find((e) => e.id === id);
    }

    findByModulo(modulo: string): Error[] {
        const todos = this.findAll();
        return todos.filter(
            (e) => e.modulo_afectado.toLowerCase() === modulo.toLowerCase()
        );
    }

    findByFrecuencia(frecuencia: string): Error[] {
        const todos = this.findAll();
        return todos.filter(
            (e) => e.frecuencia.toLowerCase() === frecuencia.toLowerCase()
        );
    }

    // CREATE: agrega un nuevo error al JSON
    create(dto: CreateErrorDto): Error {
        const errores = this.readFile();
        const nuevoError: Error = {
            id: this.getNextId(errores),
            ...dto, // Spread: copia todas las propiedades del DTO
        };
        errores.push(nuevoError);
        this.writeFile(errores);
        return nuevoError;
    }

    // UPDATE: modifica un error existente
    update(id: number, dto: UpdateErrorDto): Error {
        const errores = this.readFile();
        const index = errores.findIndex((e) => e.id === id);

        if (index === -1) {
            throw new NotFoundException(`Error con id ${id} no encontrado`);
        }

        // Merge: conservamos lo que ya existe y sobrescribimos con lo nuevo
        errores[index] = { ...errores[index], ...dto };
        this.writeFile(errores);
        return errores[index];
    }

    // DELETE: elimina un error por ID
    delete(id: number): { message: string } {
        const errores = this.readFile();
        const index = errores.findIndex((e) => e.id === id);

        if (index === -1) {
            throw new NotFoundException(`Error con id ${id} no encontrado`);
        }

        // splice elimina 1 elemento en la posicion index
        errores.splice(index, 1);
        this.writeFile(errores);
        return { message: `Error con id ${id} eliminado correctamente` };
    }
}
