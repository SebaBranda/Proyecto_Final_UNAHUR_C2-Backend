import mongoose from 'mongoose';
import {
  Cliente, Contador, Jornada, Reclamo, Reporte, Usuario, Vehiculo,
} from '../models/schemas.js';

export async function conectarBaseDeDatos(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Conectado exitosamente a MongoDB');
}

export async function cerrarBaseDeDatos() {
  await mongoose.disconnect();
}

// Reglas que hace cumplir la propia base con índices únicos (están definidos en schemas.js).
const REGLAS_UNICAS = [
  [Vehiculo, 'hay vehículos con la misma patente'],
  [Reclamo, 'hay técnicos con más de un reclamo en progreso'],
  [Jornada, 'hay técnicos con más de una jornada activa'],
];

// Crea los índices únicos al arrancar. Si ya hay datos que rompen una regla, ese índice no se
// puede crear: se avisa en el registro y el servidor sigue funcionando (la regla la sigue
// validando el servicio, pero sin la garantía ante dos pedidos al mismo tiempo).
export async function crearIndicesUnicos() {
  for (const [Modelo, datosRepetidos] of REGLAS_UNICAS) {
    try {
      await Modelo.createIndexes();
    } catch (error) {
      const motivo = error.code === 11000 ? datosRepetidos : error.message;
      console.error(`No se pudo crear un índice único de "${Modelo.collection.name}": ${motivo}. Corregí esos datos y reiniciá el servidor.`);
    }
  }
}

const RECURSOS_CON_CONTADOR = {
  usuarios: Usuario,
  clientes: Cliente,
  vehiculos: Vehiculo,
  reclamos: Reclamo,
  jornadas: Jornada,
  reportes: Reporte,
};

// Pone cada contador de ids al día con el id más alto que ya existe en su colección (datos
// anteriores a los contadores, datos demo o registros cargados a mano). $max nunca lo baja.
export async function sincronizarContadores() {
  for (const [nombre, Modelo] of Object.entries(RECURSOS_CON_CONTADOR)) {
    const ultimo = await Modelo.findOne().sort({ id: -1 }).select('id').lean();
    await Contador.updateOne({ _id: nombre }, { $max: { valor: ultimo?.id ?? 0 } }, { upsert: true });
  }
}
