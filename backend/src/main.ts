import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS: permite que el frontend (puerto diferente) se comunique con el backend
  app.enableCors({
    origin: 'http://localhost:5174', // Puerto default de Vite
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
