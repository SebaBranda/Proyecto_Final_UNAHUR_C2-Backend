import mongoose from 'mongoose';
import {
  adminPerfilesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
  usuariosIniciales,
} from '../data/store.js';
import { UsuariosMemoryRepository } from './usuarios.memory.repository.js';
import { UsuariosMongoRepository } from './usuarios.mongo.repository.js';

const repositorioMemoria = new UsuariosMemoryRepository(usuariosIniciales, {
  adminPerfilesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
});
const repositorioMongo = new UsuariosMongoRepository();

export const usuariosRepository = crearRepositorioActivo(repositorioMemoria, repositorioMongo);

function crearRepositorioActivo(memoria, mongo) {
  return new Proxy(memoria, {
    get(target, propiedad) {
      const repositorio = mongoose.connection.readyState === 1 ? mongo : target;
      const valor = repositorio[propiedad];
      return typeof valor === 'function' ? valor.bind(repositorio) : valor;
    },
  });
}