import dotenv from 'dotenv';
import { crearAplicacion } from './src/app.js';
import { conectarBaseDeDatos } from './src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/galacticapp_db';
const app = crearAplicacion();

async function iniciarServidor() {
  app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));

  try {
    await conectarBaseDeDatos(MONGO_URI);
  } catch (error) {
    console.warn('MongoDB no está disponible; el servidor continúa activo:', error.message);
  }
}

iniciarServidor();