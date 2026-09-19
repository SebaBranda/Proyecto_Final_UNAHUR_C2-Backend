import dotenv from 'dotenv';
import { crearAplicacion } from './src/app.js';
import { conectarBaseDeDatos } from './src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/galacticapp_db';
const app = crearAplicacion();

async function iniciarServidor() {
  try {
    await conectarBaseDeDatos(MONGO_URI);
    app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exitCode = 1;
  }
}

iniciarServidor();