# ============================================================
# Portal de Herramientas - Proceso gestionado con PM2
# ============================================================
# Alternativa a Docker: mantiene el backend corriendo en el servidor,
# lo reinicia si falla y arranca al iniciar el sistema.
#
# Uso:
#   npm install -g pm2
#   cd backend && npm run build && cd ..
#   pm2 start ecosystem.config.cjs
#   pm2 save
#   pm2 startup      # seguir la instruccion que imprime
#
# Ver estado:   pm2 status
# Ver logs:     pm2 logs portal
# Reiniciar:    pm2 restart portal
# ============================================================

module.exports = {
  apps: [
    {
      name: 'portal',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',

      // Reinicio automatico si se cae o consume demasiada memoria
      autorestart: true,
      max_memory_restart: '500M',
      // Esperar antes de reintentar, para no entrar en bucle
      restart_delay: 3000,

      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // JWT_SECRET, TOKEN_TTL, LOGIN_MAX_INTENTOS y CORS_ORIGINS
        // se leen de backend/.env
      },

      // No arrancar si el archivo compilado no existe
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
