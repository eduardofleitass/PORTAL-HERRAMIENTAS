import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { CONFIG, validarConfig } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // En produccion no filtrar stack traces al cliente
    logger: CONFIG.esProduccion ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Necesario para que req.ip refleje la IP real detras de un proxy
  // (asi el rate limiting de login no se esquiva por X-Forwarded-For)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().set('trust proxy', 1);

  // CORS: en produccion solo los origenes declarados en CORS_ORIGINS
  // (separados por coma). En desarrollo se permiten origenes locales.
  const origenesConfigurados = CONFIG.corsOrigins
    ? CONFIG.corsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: origenesConfigurados.length
      ? origenesConfigurados
      : [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/, /^file:\/\//],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Servir avatares subidos
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // En produccion, servir el frontend compilado estaticamente
  if (CONFIG.esProduccion) {
    const frontendDist =
      CONFIG.frontendDist || path.join(__dirname, '..', '..', 'frontend', 'dist');

    // Cache de assets con hash; el index.html sin cache para tomar deploys nuevos
    app.use(
      express.static(frontendDist, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
  }

  validarConfig();
  await app.listen(CONFIG.puerto);
}

// Arranque con mensaje claro si el puerto ya esta ocupado.
// Sin esto, Node imprime un volcado de 30 lineas que no ayuda a nadie.
try {
  await bootstrap();
} catch (err: any) {
  if (err?.code === 'EADDRINUSE') {
    const puerto = CONFIG.puerto;
    console.error('\n============================================================');
    console.error(`[error] El puerto ${puerto} ya esta en uso.`);
    console.error('============================================================');
    console.error('Hay otro proceso usando ese puerto. Causas habituales:');
    console.error('  - El servicio de Windows "PortalHerramientas" ya esta corriendo');
    console.error('  - Otra consola con el portal abierto');
    console.error('  - Una instancia anterior que quedo viva');
    console.error('');
    console.error('Si el portal ya funciona, no hace falta arrancarlo de nuevo.');
    console.error('Para ver quien ocupa el puerto:');
    console.error(`  netstat -ano | findstr ":${puerto}" | findstr LISTENING`);
    console.error('Para cerrarlo (reemplazar PID por el numero que muestra):');
    console.error('  taskkill /F /PID <PID>');
    console.error('');
    console.error('Para usar otro puerto, defini PORT en backend/.env');
    console.error('============================================================\n');
    process.exit(1);
  }
  console.error('[error] No se pudo arrancar el servidor:', err);
  process.exit(1);
}
