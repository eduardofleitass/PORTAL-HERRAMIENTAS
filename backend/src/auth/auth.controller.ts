import { Controller, Post, Body, UnauthorizedException, Inject } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

//DTO (Data transfer Object): define la forma de los datos de entrada
interface LoginDto{
    username: string;
    password: string;
}
@Controller('auth')
export class AuthController{
    constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
) {
    console.log('AuthService inyectado:', this.authService);
}
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