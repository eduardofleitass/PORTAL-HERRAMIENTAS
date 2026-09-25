import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS: permite que el frontend (cualquier puerto localhost) se comunique con el backend
  app.enableCors({
    origin: [/http:\/\/localhost:\d+/],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Servir archivos estaticos desde /uploads usando express directamente
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
