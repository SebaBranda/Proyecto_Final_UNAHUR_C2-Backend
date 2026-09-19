import mongoose from 'mongoose';

export async function conectarBaseDeDatos(uri) {
  await mongoose.connect(uri);
  console.log('Conectado exitosamente a MongoDB');
}

export async function cerrarBaseDeDatos() {
  await mongoose.disconnect();
}
