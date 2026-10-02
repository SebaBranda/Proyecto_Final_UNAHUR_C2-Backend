import { crearControladorCrud } from './crud.controller.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';

export const tecnicosCrud = crearControladorCrud({
	repository: usuariosRepository,
	camposRequeridos: ['usuario', 'contrasena', 'nombre'],
	rol: 'Tecnico',
	valoresPorDefecto: { rol: 'Tecnico', activo: true },
	normalizar: (tecnico) => ({ ...tecnico, rol: 'Tecnico' }),
	nombre: 'Técnico',
	async validar(tecnico, actual, repository) {
		if (await repository.existeNombreUsuario(tecnico.usuario, actual?.id)) {
			return 'El nombre de usuario ya existe';
		}
		return null;
	},
});