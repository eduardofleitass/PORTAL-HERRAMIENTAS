import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

export interface UsuarioEntity {
  id: number;
  username: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  avatar?: string;
}

export interface CrearUsuarioDto {
  username: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'usuario';
}

@Injectable()
export class UsuariosService {
  private readonly dataPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataPath = path.join(__dirname, '..', '..', 'data', 'usuarios.json');
  }

  private readAll(): UsuarioEntity[] {
    const raw = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(raw);
  }

  private writeAll(data: UsuarioEntity[]): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  findAll(): Omit<UsuarioEntity, 'password'>[] {
    return this.readAll().map(({ password, ...rest }) => rest);
  }

  findOne(id: number): Omit<UsuarioEntity, 'password'> | undefined {
    const user = this.readAll().find((u) => u.id === id);
    if (!user) return undefined;
    const { password, ...rest } = user;
    return rest;
  }

  create(dto: CrearUsuarioDto): Omit<UsuarioEntity, 'password'> {
    const all = this.readAll();
    const exists = all.find((u) => u.username === dto.username);
    if (exists) {
      throw new ConflictException(`El usuario '${dto.username}' ya existe`);
    }
    const newId = all.length > 0 ? Math.max(...all.map((u) => u.id)) + 1 : 1;
    const nuevo: UsuarioEntity = {
      id: newId,
      username: dto.username,
      password: dto.password,
      nombre: dto.nombre,
      rol: dto.rol,
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
      ...(dto.password && { password: dto.password }),
      ...(dto.nombre && { nombre: dto.nombre }),
      ...(dto.rol && { rol: dto.rol }),
    };
    all[idx] = actualizado;
    this.writeAll(all);
    const { password, ...rest } = actualizado;
    return rest;
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

    // Borrar avatar anterior si existe
    if (all[idx].avatar) {
      const oldPath = path.join(path.dirname(this.dataPath), '..', all[idx].avatar!);
      try { fs.unlinkSync(oldPath); } catch {}
    }

    // Guardar path relativo a la carpeta backend (sin 'backend/')
    const relPath = avatarPath.replace(/\\/g, '/');
    all[idx].avatar = relPath;
    this.writeAll(all);
    const { password, ...rest } = all[idx];
    return rest;
  }
}
