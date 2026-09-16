import { Controller, Post,Body,UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

//DTO (Data transfer Object): define la forma de los datos de entrada
interface LoginDto{
    username: string;
    password: string;
}
@Controller('auth')
export class AuthController{
    constructor(private readonly authService: AuthService){}
    //POST /auth/login
    //Recibe {username,password} y devuelve {token, usuario}
    @Post('login')
    login(@Body() credenciales: LoginDto){
        //Validamos que vengan ambos campos
        if (!credenciales.username || !credenciales.password){
            throw new UnauthorizedException('Username y password son requeridos');
        }
        return this.authService.login(credenciales.username, credenciales.password)
    }
}