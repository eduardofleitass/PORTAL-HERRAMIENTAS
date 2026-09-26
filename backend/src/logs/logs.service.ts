import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

export interface LogEntry {
  id: number;
  fecha: string;
  nivel: 'info' | 'success' | 'warning' | 'error';
  accion: string;
  usuario?: string;
  detalle?: string;
  extra?: string;
  ip?: string;
}

export interface Resumen {
  total: number;
  porNivel: Record<string, number>;
  ultimo: string | null;
}

@Injectable()
export class LogsService {
  private readonly dataPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(__dirname, '..', '..', 'data', 'logs.json');
    this.ensureFile();
  }

  private ensureFile(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, '[]', 'utf-8');
    }
  }

  private readAll(): LogEntry[] {
    const raw = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(raw);
  }

  private writeAll(data: LogEntry[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  findAll(): LogEntry[] {
    return this.readAll();
  }

  getResumen(): Resumen {
    const logs = this.readAll();
    const porNivel: Record<string, number> = { info: 0, success: 0, warning: 0, error: 0 };
    for (const l of logs) {
      porNivel[l.nivel] = (porNivel[l.nivel] || 0) + 1;
    }
    return {
      total: logs.length,
      porNivel,
      ultimo: logs.length > 0 ? logs[logs.length - 1].fecha : null,
    };
  }

  create(entry: Omit<LogEntry, 'id' | 'fecha'>): LogEntry {
    const logs = this.readAll();
    const nuevo: LogEntry = {
      ...entry,
      id: logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
      fecha: new Date().toISOString(),
    };
    logs.push(nuevo);
    this.writeAll(logs);
    return nuevo;
  }

  clear(): { eliminados: number } {
    const logs = this.readAll();
    const count = logs.length;
    this.writeAll([]);
    return { eliminados: count };
  }
}
