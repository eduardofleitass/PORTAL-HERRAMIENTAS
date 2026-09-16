import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
    controllers: [AuthController],
    providers: [AuthService],
    exports:[AuthService],//exportamos para que otros modulos puedan usar AuthService
})
export class AuthModule{}