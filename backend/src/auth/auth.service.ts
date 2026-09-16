import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { privateDecrypt } from 'crypto';

export interface Usuario{ //creamos la interfaz de usuario donde difinimos la estructura que debe tener un objeto de tipo usuario
    id:number,
    username:string,
    password:string,
    nombre:string,
    rol: 'admin' | 'user'
}

@Injectable() //indicamos la clase que puede ser inyectada como dependencia
export class AuthService {
    private readonly dataPath: string; //variable para guardar la ruta del archivo usuarios.json
    //Clave secreta para firmar tokents (en producción va en variable de entorno)
    private readonly jwtSecret= 'portal-herramientas-secreto-2026'
    constructor(){ //el constructos se ejecuta cuando existe la instacia authservices
        const __filename= fileURLToPath(import.meta.url);
        const __dirname= path.dirname(__filename);
        this.dataPath= path.join(__dirname,'..','..','data','usuarios.json');
    }
    //Lee todos los usuarios del JSON (who is json?)
private findAll():Usuario[]{
    const rawData= fs.readFileSync(this.dataPath,'utf-8')
    return JSON.parse(rawData)
}
//Busca usuarios por username
private findByUsername(username:string):Usuario | undefined{
    return this.findAll().find((u)=>u.username === username)
}
//LOGIN: recibe credenciales
login(username:string,password:string):{token: string; usuario: Omit<Usuario,'password'>}{
    const usuario = this.findByUsername(username);
    //Logica de si no existe la contraseña o el user lanzamos un error potente
    if (!usuario || usuario.password !== password){
        throw new UnauthorizedException('Credenciales invalidas');
    }
    //creamos el paylead del token (lo que va dentro del JWT)
    const paylaod={
        sub: usuario.id, // "sub"= subject, identifica al usuario
        username: usuario.username,
        rol: usuario.rol,
    };
    //Firmamos el token con la clave secreta, expira en 8 horas
    const token = jwt.sign(paylaod, this.jwtSecret,{expiresIn: '8h'});

    //Devolvemos el token y los datos del usuario (sin la password)
    const {password:_ , ...usuarioSinPassword}= usuario;
    return {token, usuario: usuarioSinPassword};
}
// Recibe un token y devuelve los datos almacenados dentro del token
verifyToken(token: string): {
    sub: number;
    username: string;
    rol: string;
} {

    // Verifica que el token sea válido utilizando nuestra clave secreta
    // y obtiene la información guardada dentro del token.
    const decoded = jwt.verify(token, this.jwtSecret);

    // jwt.verify también puede devolver un string.
    // Si ocurre, consideramos que el token no tiene el formato esperado.
    if (typeof decoded === 'string') {
        throw new Error('Token inválido');
    }

    // Retornamos solamente los datos que necesitamos del token.
    return {
        // sub representa normalmente el ID del usuario.
        sub: Number(decoded.sub),

        // Nombre de usuario almacenado en el token.
        username: decoded.username as string,

        // Rol del usuario almacenado en el token.
        rol: decoded.rol as string,
    };
}
}

