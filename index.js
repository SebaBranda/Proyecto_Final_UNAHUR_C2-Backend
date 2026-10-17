import dotenv from 'dotenv';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAplicacion } from './src/app.js';
import { conectarBaseDeDatos } from './src/config/database.js';
import { sembrarDatosIniciales } from './src/config/seed.js';
import { generate } from 'selfsigned';

dotenv.config();

const PORT = process.env.HTTPS_PORT || process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const app = crearAplicacion();

async function iniciarServidor() {
  if (!MONGO_URI) throw new Error('MONGO_URI debe configurarse');
  try {
    await conectarBaseDeDatos(MONGO_URI);
  } catch (error) {
    throw new Error(`No se pudo conectar con MongoDB: ${error.message}`, { cause: error });
  }
  await sembrarDatosIniciales();

  if (process.env.HTTPS_ENABLED === 'true') {
    const httpsOptions = await cargarCertificados();
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`Servidor HTTPS escuchando en https://localhost:${PORT}`);
    });
    return;
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP escuchando en http://localhost:${PORT}`);
  });
}

iniciarServidor().catch((error) => {
  console.error('No se pudo iniciar GalacticApp:', error);
  process.exitCode = 1;
});

async function cargarCertificados() {
  const keyPath = path.resolve(process.env.HTTPS_KEY_PATH || 'certs/localhost.key');
  const certPath = path.resolve(process.env.HTTPS_CERT_PATH || 'certs/localhost.crt');

  try {
    return {
      key: await fs.readFile(keyPath),
      cert: await fs.readFile(certPath),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    const atributos = [{ name: 'commonName', value: 'localhost' }];
    const certificado = await generate(atributos, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
    });
    await fs.mkdir(path.dirname(keyPath), { recursive: true });
    await Promise.all([
      fs.writeFile(keyPath, certificado.private, { mode: 0o600 }),
      fs.writeFile(certPath, certificado.cert, { mode: 0o644 }),
    ]);
    console.warn('Se generó un certificado autofirmado para desarrollo local.');
    return { key: certificado.private, cert: certificado.cert };
  }
}