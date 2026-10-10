import mongoose from 'mongoose';
import { UbicacionesMemoryRepository } from './ubicaciones.memory.repository.js';
import { UbicacionesMongoRepository } from './ubicaciones.mongo.repository.js';

const repositorioMemoria = new UbicacionesMemoryRepository();
const repositorioMongo = new UbicacionesMongoRepository();

export const ubicacionesRepository = new Proxy(repositorioMemoria, {
  get(target, propiedad) {
    const repositorio = mongoose.connection.readyState === 1 ? repositorioMongo : target;
    const valor = repositorio[propiedad];
    return typeof valor === 'function' ? valor.bind(repositorio) : valor;
  },
});
