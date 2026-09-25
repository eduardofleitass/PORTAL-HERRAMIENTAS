import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';
import jwt from 'jsonwebtoken';

export interface Usuario{
    id:number,
    username:string,
    password:string,
    nombre:string,
    rol: 'admin' | 'usuario',
    avatar?: string;
}

@Injectable()
export class AuthService {
    private readonly dataPath: string;
    private readonly jwtSecret= 'portal-herramientas-secreto-2026'
    constructor(){
        const __filename= fileURLToPath(import.meta.url);
        const __dirname= path.dirname(__filename);
        this.dataPath= path.join(__dirname,'..','..','data','usuarios.json');
    }

    private findAll():Usuario[]{
        const rawData= fs.readFileSync(this.dataPath,'utf-8')
        return JSON.parse(rawData)
    }

    private findByUsername(username:string):Usuario | undefined{
        return this.findAll().find((u)=>u.username === username)
    }

    login(username:string,password:string):{token: string; usuario: Omit<Usuario,'password'>}{
        const usuario = this.findByUsername(username);
        if (!usuario || usuario.password !== password){
            throw new UnauthorizedException('Credenciales invalidas');
        }
        const paylaod={
            sub: usuario.id,
            username: usuario.username,
            rol: usuario.rol,
        };
        const token = jwt.sign(paylaod, this.jwtSecret,{expiresIn: '8h'});
        const {password:_ , ...usuarioSinPassword}= usuario;
        return {token, usuario: usuarioSinPassword};
    }

    verifyToken(token: string): {
        sub: number;
        username: string;
        rol: string;
    } {
        const decoded = jwt.verify(token, this.jwtSecret);
        if (typeof decoded === 'string') {
            throw new Error('Token inválido');
        }
        return {
            sub: Number(decoded.sub),
            username: decoded.username as string,
            rol: decoded.rol as string,
        };
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
