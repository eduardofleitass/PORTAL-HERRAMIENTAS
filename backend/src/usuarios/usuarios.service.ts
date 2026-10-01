import { Injectable, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getDataPath } from '../data-path.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export interface Permisos {
  modulos: {
    dashboard: boolean;
    procedimientos: boolean;
    errores: boolean;
    documentacion: boolean;
    actividad: boolean;
    usuarios: boolean;
  };
  acciones: {
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    exportarPDF: boolean;
    exportarCSV: boolean;
  };
}

export const PERMISOS_ADMIN: Permisos = {
  modulos: { dashboard: true, procedimientos: true, errores: true, documentacion: true, actividad: true, usuarios: true },
  acciones: { crear: true, editar: true, eliminar: true, exportarPDF: true, exportarCSV: true },
};

export const PERMISOS_USUARIO_DEFAULT: Permisos = {
  modulos: { dashboard: true, procedimientos: true, errores: true, documentacion: true, actividad: false, usuarios: false },
  acciones: { crear: false, editar: false, eliminar: false, exportarPDF: false, exportarCSV: false },
};

export interface UsuarioEntity {
  id: number;
  username: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  avatar?: string;
  activo?: boolean;
  permisos?: Permisos;
}

export interface CrearUsuarioDto {
  username: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  activo?: boolean;
  permisos?: Permisos;
}

@Injectable()
export class UsuariosService {
  private readonly dataPath: string;

  constructor() {
    this.dataPath = getDataPath('usuarios.json');
  }

  private readAll(): UsuarioEntity[] {
    const raw = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(raw);
  }

  private writeAll(data: UsuarioEntity[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private ensurePermisos(u: UsuarioEntity): Permisos {
    if (u.permisos) return u.permisos;
    return u.rol === 'admin' ? PERMISOS_ADMIN : PERMISOS_USUARIO_DEFAULT;
  }

  findAll(): Omit<UsuarioEntity, 'password'>[] {
    return this.readAll().map(({ password, ...rest }) => ({
      ...rest,
      permisos: this.ensurePermisos(rest as UsuarioEntity),
    }));
  }

  findOne(id: number): Omit<UsuarioEntity, 'password'> | undefined {
    const user = this.readAll().find((u) => u.id === id);
    if (!user) return undefined;
    const { password, ...rest } = user;
    return { ...rest, permisos: this.ensurePermisos(user) };
  }

  findByUsername(username: string): UsuarioEntity | undefined {
    return this.readAll().find((u) => u.username === username);
  }

  create(dto: CrearUsuarioDto): Omit<UsuarioEntity, 'password'> {
    const all = this.readAll();
    const exists = all.find((u) => u.username === dto.username);
    if (exists) {
      throw new ConflictException(`El usuario '${dto.username}' ya existe`);
    }
    const newId = all.length > 0 ? Math.max(...all.map((u) => u.id)) + 1 : 1;
    const permisos = dto.permisos ?? (dto.rol === 'admin' ? PERMISOS_ADMIN : PERMISOS_USUARIO_DEFAULT);
    const nuevo: UsuarioEntity = {
      id: newId,
      username: dto.username,
      password: bcrypt.hashSync(dto.password, BCRYPT_ROUNDS),
      nombre: dto.nombre,
      rol: dto.rol,
      activo: dto.activo ?? true,
      permisos,
    };
    all.push(nuevo);
    this.writeAll(all);
    const { password, ...rest } = nuevo;
    return rest;
  }

  update(id: number, dto: Partial<CrearUsuarioDto>): Omit<UsuarioEntity, 'password'> | undefined {
    const all = this.readAll();
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;

    if (dto.username) {
      const exists = all.find((u) => u.username === dto.username && u.id !== id);
      if (exists) {
        throw new ConflictException(`El username '${dto.username}' ya esta en uso`);
      }
    }

    const actualizado: UsuarioEntity = {
      ...all[idx],
      ...(dto.username && { username: dto.username }),
      ...(dto.password && { password: bcrypt.hashSync(dto.password, BCRYPT_ROUNDS) }),
      ...(dto.nombre && { nombre: dto.nombre }),
      ...(dto.rol && { rol: dto.rol }),
      ...(dto.activo !== undefined && { activo: dto.activo }),
      ...(dto.permisos && { permisos: dto.permisos }),
    };
    all[idx] = actualizado;
    this.writeAll(all);
    const { password, ...rest } = actualizado;
    return { ...rest, permisos: this.ensurePermisos(actualizado) };
  }

  remove(id: number): boolean {
    const all = this.readAll();
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    this.writeAll(all);
    return true;
  }

  updateAvatar(id: number, avatarPath: string): Omit<UsuarioEntity, 'password'> | undefined {
    const all = this.readAll();
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;

    if (all[idx].avatar) {
      const oldPath = path.join(path.dirname(this.dataPath), '..', all[idx].avatar!);
      try { fs.unlinkSync(oldPath); } catch {}
    }

    const relPath = avatarPath.replace(/\\/g, '/');
    all[idx].avatar = relPath;
    this.writeAll(all);
    const { password, ...rest } = all[idx];
    return { ...rest, permisos: this.ensurePermisos(all[idx]) };
  }
}
