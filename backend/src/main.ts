import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/, /^file:\/\//],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Servir avatares subidos
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // En produccion, servir el frontend compilado estaticamente
  if (process.env.NODE_ENV === 'production') {
    const frontendDist = process.env.PORTAL_FRONTEND_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));
  }

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
