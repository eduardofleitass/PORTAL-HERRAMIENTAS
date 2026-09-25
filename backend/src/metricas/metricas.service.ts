import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

@Injectable()
export class MetricasService {
  private readonly dataPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(__dirname, '..', '..', 'data');
  }

  private leerJSON(nombre: string) {
    const ruta = path.join(this.dataPath, `${nombre}.json`);
    const raw = fs.readFileSync(ruta, 'utf-8');
    return JSON.parse(raw);
  }

  getMetricas() {
    const procedimientos = this.leerJSON('procedimientos');
    const errores = this.leerJSON('errores');
    const documentacion = this.leerJSON('documentacion');

    // Procedimientos por modulo
    const modsProcedimientos: Record<string, number> = {};
    procedimientos.forEach((p: any) => {
      modsProcedimientos[p.modulo] = (modsProcedimientos[p.modulo] || 0) + 1;
    });

    // Procedimientos por nivel
    const nivelesProcedimientos: Record<string, number> = {};
    procedimientos.forEach((p: any) => {
      nivelesProcedimientos[p.nivel] = (nivelesProcedimientos[p.nivel] || 0) + 1;
    });

    // Errores por modulo
    const modsErrores: Record<string, number> = {};
    errores.forEach((e: any) => {
      modsErrores[e.modulo_afectado] = (modsErrores[e.modulo_afectado] || 0) + 1;
    });

    // Errores por frecuencia
    const frecuenciasErrores: Record<string, number> = {};
    errores.forEach((e: any) => {
      frecuenciasErrores[e.frecuencia] = (frecuenciasErrores[e.frecuencia] || 0) + 1;
    });

    // Documentos por seccion
    const seccionesDocs: Record<string, number> = {};
    documentacion.forEach((d: any) => {
      seccionesDocs[d.seccion] = (seccionesDocs[d.seccion] || 0) + 1;
    });

    // Tags mas usados
    const tagsCount: Record<string, number> = {};
    errores.forEach((e: any) => {
      (e.tags || []).forEach((tag: string) => {
        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
      });
    });
    const tagsTop = Object.entries(tagsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totales: {
        procedimientos: procedimientos.length,
        errores: errores.length,
        documentacion: documentacion.length,
      },
      procedimientosPorModulo: modsProcedimientos,
      procedimientosPorNivel: nivelesProcedimientos,
      erroresPorModulo: modsErrores,
      erroresPorFrecuencia: frecuenciasErrores,
      documentosPorSeccion: seccionesDocs,
      tagsTop,
      ultimosAgregados: {
        procedimientos: procedimientos.slice(-3).reverse().map((p: any) => ({
          id: p.id,
          titulo: p.titulo,
          modulo: p.modulo,
        })),
        errores: errores.slice(-3).reverse().map((e: any) => ({
          id: e.id,
          codigo: e.codigo,
          titulo: e.titulo,
          modulo: e.modulo_afectado,
        })),
      },
    };
  }
}
