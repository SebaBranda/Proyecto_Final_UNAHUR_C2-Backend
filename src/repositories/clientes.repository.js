import mongoose from 'mongoose';
import { clientesIniciales } from '../data/store.js';
import { ClientesMemoryRepository } from './clientes.memory.repository.js';
import { ClientesMongoRepository } from './clientes.mongo.repository.js';

const repositorioMemoria = new ClientesMemoryRepository(clientesIniciales);
const repositorioMongo = new ClientesMongoRepository();

export const clientesRepository = new Proxy(repositorioMemoria, {
  get(target, propiedad) {
    const repositorio = mongoose.connection.readyState === 1 ? repositorioMongo : target;
    const valor = repositorio[propiedad];
    return typeof valor === 'function' ? valor.bind(repositorio) : valor;
  },
});
