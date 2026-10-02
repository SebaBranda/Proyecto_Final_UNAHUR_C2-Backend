import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import resourcesRoutes from './routes/resources.routes.js';

export function crearAplicacion() {
  const app = express();

  app.use(cors());
  app.use(express.json());

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
