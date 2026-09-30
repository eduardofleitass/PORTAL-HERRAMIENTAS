import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getDataPath } from '../data-path.js';

@Injectable()
export class MetricasService {
  private readonly dataPath: string;

  constructor() {
    this.dataPath = getDataPath('');
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

    return {
      totales: {
        procedimientos: procedimientos.length,
        errores: errores.length,
        documentacion: documentacion.length,
      },
      procedimientosPorModulo: modsProcedimientos,
      procedimientosPorNivel: nivelesProcedimientos,
      erroresPorModulo: modsErrores,
    };
  }
}
