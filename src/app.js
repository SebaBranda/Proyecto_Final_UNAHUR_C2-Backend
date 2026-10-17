import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import resourcesRoutes from './routes/resources.routes.js';

export function crearAplicacion() {
  const app = express();
  const origenesPermitidos = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

  // Los recursos de la API son dinámicos y no deben responder desde caché del navegador.
  app.disable('etag');
  app.use(cors({
    origin: origenesPermitidos.length ? origenesPermitidos : false,
    credentials: true,
  }));
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (process.env.HTTPS_ENABLED === 'true') {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  // Hasta 5 fotos de evidencia en base64 (~600 KB c/u) viajan en el mismo pedido.
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({ servicio: 'GalacticApp API', estado: 'ok' });
  });

  app.get('/api/ping', (_req, res) => {
    res.json({ status: 'success', mensaje: 'Comunicación exitosa desde el backend de GalacticApp' });
  });

  app.use('/api', resourcesRoutes);

  app.use((_req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
  });

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ mensaje: 'Los datos enviados son demasiado grandes. Probá con menos fotos.' });
    }
    const esJsonInvalido = error instanceof SyntaxError && error.status === 400 && 'body' in error;
    const esValidacionMongoose = error instanceof mongoose.Error.ValidationError;
    const esDuplicado = error.code === 'DUPLICATE_USERNAME' || error.code === 11000;
    const estado = esJsonInvalido || esValidacionMongoose || esDuplicado ? 400 : 500;
    console.error(error);
    const mensaje = esJsonInvalido
      ? 'JSON inválido'
      : esDuplicado
        ? 'El nombre de usuario ya existe'
        : estado === 400
          ? 'Datos inválidos'
          : 'Error interno del servidor';
    res.status(estado).json({ mensaje });
  });

  return app;
}
