import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { PermisoGuard } from "./permiso.guard.js";

@Module({
    controllers: [AuthController],
    providers: [AuthService, AuthGuard, PermisoGuard],
    exports:[AuthService, AuthGuard, PermisoGuard],
})
export class AuthModule{}