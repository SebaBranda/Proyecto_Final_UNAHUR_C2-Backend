import { clientesIniciales } from '../data/store.js';
import { ClientesMemoryRepository } from './clientes.memory.repository.js';

export const clientesRepository = new ClientesMemoryRepository(clientesIniciales);
