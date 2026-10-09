import {
  adminPerfilesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
  usuariosIniciales,
} from '../data/store.js';
import { UsuariosMemoryRepository } from './usuarios.memory.repository.js';

export const usuariosRepository = new UsuariosMemoryRepository(usuariosIniciales, {
  adminPerfilesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
});