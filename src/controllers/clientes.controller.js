import { crearControladorCrud } from './crud.controller.js';
import { clientesRepository } from '../repositories/clientes.repository.js';

export const clientesCrud = crearControladorCrud({
  repository: clientesRepository,
  camposRequeridos: ['nombre'],
  valoresPorDefecto: { activo: true },
  nombre: 'Cliente',
});
