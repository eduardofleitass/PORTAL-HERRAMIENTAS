import { Module } from "@nestjs/common";
import { ErroresController} from "./errores.controller.js";
import { ErroresService } from "./errores.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    imports: [AuthModule],
    controllers: [ErroresController],
    providers: [ErroresService],

})
export class ErroresModule{}