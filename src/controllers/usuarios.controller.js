import { crearControladorCrud } from './crud.controller.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';

const roles = new Set(['Administrador', 'Coordinador', 'Tecnico']);

export const usuariosCrud = crearControladorCrud({
  repository: usuariosRepository,
  camposRequeridos: ['usuario', 'contrasena', 'nombre', 'rol'],
  valoresPorDefecto: { activo: true },
  nombre: 'Usuario',
  async validar(registro, actual, repository) {
    if (!roles.has(registro.rol)) return 'El rol debe ser Administrador, Coordinador o Tecnico';
    if (await repository.existeNombreUsuario(registro.usuario, actual?.id)) {
      return 'El nombre de usuario ya existe';
    }
    return null;
  },
});