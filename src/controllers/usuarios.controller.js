import { crearControladorCrud } from './crud.controller.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { prepararUsuarioParaGuardar, serializarUsuario } from '../services/usuarios.service.js';

const roles = new Set(['Administrador', 'Coordinador', 'Tecnico']);

export const usuariosCrud = crearControladorCrud({
  repository: usuariosRepository,
  camposRequeridos: ['usuario', 'nombre', 'rol'],
  valoresPorDefecto: { activo: true },
  preparar: prepararUsuarioParaGuardar,
  serializar: serializarUsuario,
  nombre: 'Usuario',
  async validar(registro, actual, repository) {
    if (!actual && (typeof registro.contrasena !== 'string' || !registro.contrasena)) {
      return 'Se requiere una contraseña';
    }
    if (Object.hasOwn(registro, 'contrasena')
      && (typeof registro.contrasena !== 'string' || !registro.contrasena)) {
      return 'La contraseña no puede estar vacía';
    }
    if (!roles.has(registro.rol)) return 'El rol debe ser Administrador, Coordinador o Tecnico';
    if (await repository.existeNombreUsuario(registro.usuario, actual?.id)) {
      return 'El nombre de usuario ya existe';
    }
    return null;
  },
});