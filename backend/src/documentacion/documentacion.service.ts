import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import { fileURLToPath } from "url";
import * as path from "path";

export interface Documento {
  id: number;
  titulo: string;
  descripcion: string;
  seccion: string;
  nombreArchivo: string;
  rutaArchivo: string;
  tamano: number;
  fechaSubida: string;
}

export interface CreateDocumentoDto {
  titulo: string;
  descripcion: string;
  seccion: string;
}

@Injectable()
export class DocumentacionService {
  private readonly dataPath: string;
  private readonly uploadsPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(__dirname, "..", "..", "data", "documentacion.json");
    this.uploadsPath = path.join(__dirname, "..", "..", "uploads");
  }

  private readFile(): Documento[] {
    if (!fs.existsSync(this.dataPath)) return [];
    const rawData = fs.readFileSync(this.dataPath, "utf-8");
    return JSON.parse(rawData);
  }

  private writeFile(data: Documento[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), "utf-8");
  }

  private getNextId(): number {
    const docs = this.readFile();
    if (docs.length === 0) return 1;
    return Math.max(...docs.map((d) => d.id)) + 1;
  }

  findAll(): Documento[] {
    return this.readFile();
  }

  findBySeccion(seccion: string): Documento[] {
    return this.readFile().filter(
      (d) => d.seccion.toLowerCase() === seccion.toLowerCase()
    );
  }

  findOne(id: number): Documento | undefined {
    return this.readFile().find((d) => d.id === id);
  }

  create(dto: CreateDocumentoDto, buffer: Buffer, nombreOriginal: string): Documento {
    const docs = this.readFile();
    const id = this.getNextId();

    // Guardar archivo fisico
    const extension = path.extname(nombreOriginal) || ".bin";
    const nombreUnico = `doc_${id}_${Date.now()}${extension}`;
    const rutaCompleta = path.join(this.uploadsPath, nombreUnico);
    fs.writeFileSync(rutaCompleta, buffer);

    const nuevo: Documento = {
      id,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      seccion: dto.seccion,
      nombreArchivo: nombreOriginal,
      rutaArchivo: `/uploads/${nombreUnico}`,
      tamano: buffer.length,
      fechaSubida: new Date().toISOString()
    };

    docs.push(nuevo);
    this.writeFile(docs);
    return nuevo;
  }

  delete(id: number): { message: string } {
    const docs = this.readFile();
    const index = docs.findIndex((d) => d.id === id);
    if (index === -1) {
      return { message: `Documento ${id} no encontrado` };
    }

    // Borrar archivo fisico
    const doc = docs[index];
    const rutaFisica = path.join(this.uploadsPath, path.basename(doc.rutaArchivo));
    if (fs.existsSync(rutaFisica)) {
      fs.unlinkSync(rutaFisica);
    }

    docs.splice(index, 1);
    this.writeFile(docs);
    return { message: `Documento ${id} eliminado` };
  }

  update(id: number, dto: { titulo: string; descripcion: string; seccion: string }): Documento | { message: string } {
    const docs = this.readFile();
    const index = docs.findIndex((d) => d.id === id);
    if (index === -1) {
      return { message: `Documento ${id} no encontrado` };
    }
    docs[index] = { ...docs[index], titulo: dto.titulo, descripcion: dto.descripcion, seccion: dto.seccion };
    this.writeFile(docs);
    return docs[index];
  }
}
