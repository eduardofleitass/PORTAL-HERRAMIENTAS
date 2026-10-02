import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { PermisoGuard } from "./permiso.guard.js";
import { ModuloGuard } from "./modulo.guard.js";
import { LoginThrottleGuard } from "./login-throttle.guard.js";

@Module({
    controllers: [AuthController],
    providers: [AuthService, AuthGuard, PermisoGuard, ModuloGuard, LoginThrottleGuard],
    exports: [AuthService, AuthGuard, PermisoGuard, ModuloGuard, LoginThrottleGuard],
})
export class AuthModule {}
