import { crearControladorCrud } from './crud.controller.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { prepararUsuarioParaGuardar, serializarUsuario } from '../services/usuarios.service.js';

export const tecnicosCrud = crearControladorCrud({
	repository: usuariosRepository,
	camposRequeridos: ['usuario', 'nombre'],
	rol: 'Tecnico',
	valoresPorDefecto: { rol: 'Tecnico', activo: true },
	normalizar: (tecnico) => ({ ...tecnico, rol: 'Tecnico' }),
	preparar: prepararUsuarioParaGuardar,
	serializar: serializarUsuario,
	nombre: 'Técnico',
	async validar(tecnico, actual, repository) {
		if (!actual && (typeof tecnico.contrasena !== 'string' || !tecnico.contrasena)) {
			return 'Se requiere una contraseña';
		}
		if (Object.hasOwn(tecnico, 'contrasena')
			&& (typeof tecnico.contrasena !== 'string' || !tecnico.contrasena)) {
			return 'La contraseña no puede estar vacía';
		}
		if (await repository.existeNombreUsuario(tecnico.usuario, actual?.id)) {
			return 'El nombre de usuario ya existe';
		}
		return null;
	},
});