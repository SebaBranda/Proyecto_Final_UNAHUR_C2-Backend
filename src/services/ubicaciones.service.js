import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { ubicacionesRepository } from '../repositories/ubicaciones.repository.js';

export const ubicacionesService = {
  async listar(usuarioAutenticado) {
    if (usuarioAutenticado.rolId === 3) {
      const tecnicoId = convertirId(usuarioAutenticado.id);
      if (tecnicoId === null) return respuesta(401, { mensaje: 'La identidad del técnico no es válida' });
      return respuesta(200, await ubicacionesRepository.listarPorTecnico(tecnicoId));
    }
    if (![1, 2].includes(usuarioAutenticado.rolId)) {
      return respuesta(403, { mensaje: 'No tienes permisos para consultar ubicaciones' });
    }
    return respuesta(200, await ubicacionesRepository.listar());
  },

  async actualizar(tecnicoIdParametro, cuerpo, usuarioAutenticado) {
    const tecnicoId = convertirId(tecnicoIdParametro);
    if (tecnicoId === null) {
      return respuesta(400, { mensaje: 'El ID del técnico debe ser un entero positivo' });
    }
    if (usuarioAutenticado.rolId !== 3 || convertirId(usuarioAutenticado.id) !== tecnicoId) {
      return respuesta(403, { mensaje: 'Solo puedes registrar tu propia ubicación como técnico' });
    }
    if (!esObjeto(cuerpo)) {
      return respuesta(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
    }

    const { latitud, longitud } = cuerpo;
    if (typeof latitud !== 'number' || !Number.isFinite(latitud) || latitud < -90 || latitud > 90
      || typeof longitud !== 'number' || !Number.isFinite(longitud)
      || longitud < -180 || longitud > 180) {
      return respuesta(400, { mensaje: 'Se requieren latitud y longitud válidas' });
    }

    const tecnico = await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 });
    if (!tecnico || !tecnico.activo) {
      return respuesta(404, { mensaje: 'Técnico activo no encontrado' });
    }

    const ubicacion = await ubicacionesRepository.actualizar(tecnicoId, { latitud, longitud });
    return respuesta(200, ubicacion);
  },
};

function respuesta(status, body) {
  return { status, body };
}

function convertirId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}
