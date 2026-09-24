import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS: permite que el frontend (puerto diferente) se comunique con el backend
  app.enableCors({
    origin: 'http://localhost:5174',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Servir archivos estaticos desde /uploads
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
