import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getDataPath } from '../data-path.js';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';

export interface Usuario {
  id: number;
  username: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  avatar?: string;
  activo?: boolean;
  permisos?: {
    modulos: Record<string, boolean>;
    acciones: Record<string, boolean>;
  };
}

const BCRYPT_ROUNDS = 10;

/**
 * Duracion del token JWT. Con sesion deslizante este valor actua como
 * "ventana de inactividad": mientras el usuario haga peticiones, el token
 * se renueva; si deja de pedir por TOKEN_TTL, la sesion muere.
 * Configurable via TOKEN_TTL.
 */
export const TOKEN_TTL = CONFIG.tokenTtl;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly dataPath: string;
  private readonly jwtSecret: string = CONFIG.jwtSecret;

  constructor() {
    this.dataPath = getDataPath('usuarios.json');
    this.asegurarArchivo();
    this.migrarPasswordsEnClaro();
  }

  onModuleInit(): void {
    this.avisarPasswordPorDefecto();
  }

  /**
   * Si usuarios.json no existe (primer arranque o repo recien clonado),
   * lo crea a partir de usuarios.example.json.
   *
   * IMPORTANTE: ya no se crea un admin con contrasena 'admin'. Si no hay
   * plantilla, se genera una contrasena aleatoria y se imprime UNA sola vez
   * por consola, para evitar credenciales por defecto conocidas.
   */
  private asegurarArchivo(): void {
    try {
      if (fs.existsSync(this.dataPath)) return;

      const ejemploPath = path.join(path.dirname(this.dataPath), 'usuarios.example.json');
      if (fs.existsSync(ejemploPath)) {
        fs.copyFileSync(ejemploPath, this.dataPath);
        console.warn('[auth] usuarios.json no existia: creado desde usuarios.example.json');
        console.warn('[auth] ATENCION: revise las contrasenas de la plantilla antes de usar en produccion.');
        return;
      }

      // Sin plantilla: crear un admin con contrasena aleatoria
      const passwordInicial = crypto.randomBytes(9).toString('base64url');
      const base: Usuario[] = [
        {
          id: 1,
          username: 'admin',
          password: bcrypt.hashSync(passwordInicial, BCRYPT_ROUNDS),
          nombre: 'Administrador',
          rol: 'admin',
          activo: true,
        },
      ];
      fs.writeFileSync(this.dataPath, JSON.stringify(base, null, 2), 'utf-8');

      console.warn('\n============================================================');
      console.warn('[auth] usuarios.json no existia: creado usuario admin');
      console.warn(`[auth] Usuario:    admin`);
      console.warn(`[auth] Contrasena: ${passwordInicial}`);
      console.warn('[auth] Guarde esta contrasena AHORA: no se vuelve a mostrar.');
      console.warn('[auth] Cambiela desde Perfil despues del primer ingreso.');
      console.warn('============================================================\n');
    } catch (err) {
      console.error('[auth] No se pudo asegurar usuarios.json:', err);
    }
  }

  /**
   * Avisa si algun usuario sigue con la contrasena de la plantilla de ejemplo.
   * No la cambia: solo advierte, para no romper flujos de desarrollo.
   */
  private avisarPasswordPorDefecto(): void {
    try {
      const usuarios = this.findAll();
      const inseguros = usuarios.filter(
        (u) => typeof u.password === 'string' && bcrypt.compareSync('admin', u.password),
      );
      if (inseguros.length) {
        console.warn('\n[auth] ADVERTENCIA DE SEGURIDAD');
        console.warn(`[auth] ${inseguros.length} usuario(s) usan la contrasena por defecto "admin":`);
        inseguros.forEach((u) => console.warn(`[auth]   - ${u.username} (${u.rol})`));
        console.warn('[auth] Cambielas desde el modulo de Perfil.');
        console.warn('');
      }
    } catch {
      // si el archivo no se puede leer, el error ya se maneja en otro lugar
    }
  }

  private findAll(): Usuario[] {
    const rawData = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(rawData);
  }

  private findByUsername(username: string): Usuario | undefined {
    return this.findAll().find((u) => u.username === username);
  }

  findById(id: number): Usuario | undefined {
    return this.findAll().find((u) => u.id === id);
  }

  /** Detecta si un string ya es un hash bcrypt */
  private esHash(valor: string): boolean {
    return typeof valor === 'string' && /^\$2[aby]?\$\d{2}\$/.test(valor);
  }

  /**
   * Migracion automatica: recorre usuarios.json y hashea cualquier
   * contrasena que este en texto plano. Se ejecuta al iniciar el servicio.
   */
  private migrarPasswordsEnClaro(): void {
    try {
      const usuarios = this.findAll();
      let cambiados = 0;

      for (const u of usuarios) {
        if (u.password && !this.esHash(u.password)) {
          u.password = bcrypt.hashSync(u.password, BCRYPT_ROUNDS);
          cambiados++;
        }
      }

      if (cambiados > 0) {
        fs.writeFileSync(this.dataPath, JSON.stringify(usuarios, null, 2), 'utf-8');
        console.log(`[auth] ${cambiados} contrasena(s) migrada(s) a hash bcrypt`);
      }
    } catch (err) {
      console.error('[auth] Error en migracion de contrasenas:', err);
    }
  }

  login(username: string, password: string): { token: string; usuario: Omit<Usuario, 'password'> } {
    const usuario = this.findByUsername(username);

    // Verificacion en tiempo constante contra el hash
    // (usamos un hash dummy si el usuario no existe para no filtrar su existencia por timing)
    const hashDummy = '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const hashGuardado = usuario ? usuario.password : hashDummy;
    const coincide = bcrypt.compareSync(password, hashGuardado);

    if (!usuario || !coincide) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    if (usuario.activo === false) {
      throw new UnauthorizedException('Usuario inhabilitado');
    }

    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: TOKEN_TTL } as SignOptions);
    const { password: _, ...usuarioSinPassword } = usuario;
    return { token, usuario: usuarioSinPassword };
  }

  /**
   * Renueva el token a partir de uno valido (aun no vencido).
   * Se usa para sesion deslizante: mientras el usuario este activo,
   * el token se renueva y nunca expira por tiempo absoluto.
   */
  refresh(token: string): { token: string; usuario: Omit<Usuario, 'password'> } {
    let decoded: { sub: number; username: string; rol: string };
    try {
      decoded = this.verifyToken(token);
    } catch {
      throw new UnauthorizedException('Sesion expirada. Inicie sesion nuevamente.');
    }

    const usuario = this.findByUsername(decoded.username);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (usuario.activo === false) {
      throw new UnauthorizedException('Usuario inhabilitado');
    }

    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };
    const nuevoToken = jwt.sign(payload, this.jwtSecret, { expiresIn: TOKEN_TTL } as SignOptions);
    const { password: _, ...usuarioSinPassword } = usuario;
    return { token: nuevoToken, usuario: usuarioSinPassword };
  }

  verifyToken(token: string): {
    sub: number;
    username: string;
    rol: string;
  } {
    const decoded = jwt.verify(token, this.jwtSecret);
    if (typeof decoded === 'string') {
      throw new Error('Token invalido');
    }
    return {
      sub: Number(decoded.sub),
      username: decoded.username as string,
      rol: decoded.rol as string,
    };
  }

  isUserActive(userId: number): boolean {
    const all = this.findAll();
    const user = all.find((u) => u.id === userId);
    return user ? user.activo !== false : false;
  }

  /** Hashea una contrasena en claro (usado por el modulo de usuarios) */
  hashPassword(password: string): string {
    return bcrypt.hashSync(password, BCRYPT_ROUNDS);
  }

  updateAvatar(userId: number, avatarPath: string): Omit<Usuario, 'password'> | undefined {
    const all = this.findAll();
    const idx = all.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;

    // Borrar avatar anterior si existe
    if (all[idx].avatar) {
      const oldPath = path.join(path.dirname(this.dataPath), '..', all[idx].avatar!);
      try { fs.unlinkSync(oldPath); } catch {}
    }

    const relPath = avatarPath.replace(/\\\\/g, '/');
    all[idx].avatar = relPath;
    fs.writeFileSync(this.dataPath, JSON.stringify(all, null, 2), 'utf-8');
    const { password, ...rest } = all[idx];
    return rest;
  }
}
