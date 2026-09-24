import { Module } from "@nestjs/common";
import { DocumentacionController } from "./documentacion.controller.js";
import { DocumentacionService } from "./documentacion.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule],
  controllers: [DocumentacionController],
  providers: [DocumentacionService],
})
export class DocumentacionModule {}
