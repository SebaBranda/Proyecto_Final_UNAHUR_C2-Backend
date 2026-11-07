import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { ubicacionesRepository } from '../repositories/ubicaciones.repository.js';
import { recorridosRepository } from '../repositories/recorridos.repository.js';
import { jornadasRepository } from '../repositories/jornadas.repository.js';

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

  async registrarRecorrido(cuerpo, usuarioAutenticado) {
    if (usuarioAutenticado.rolId !== 3) return respuesta(403, { mensaje: 'Solo los técnicos pueden registrar recorridos' });
    if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.puntos) || !cuerpo.puntos.length) {
      return respuesta(400, { mensaje: 'Se requiere una lista de puntos de recorrido' });
    }
    const tecnicoId = convertirId(usuarioAutenticado.id);
    const jornadaId = convertirId(cuerpo.jornadaId);
    const jornada = jornadaId ? await jornadasRepository.buscarPorId(jornadaId) : null;
    if (!jornada || jornada.tecnicoId !== tecnicoId) {
      return respuesta(400, { mensaje: 'La jornada activa no es válida' });
    }
    const puntos = cuerpo.puntos.map((punto) => ({
      tecnicoId,
      jornadaId,
      latitud: Number(punto.latitud),
      longitud: Number(punto.longitud),
      registradoEn: new Date(punto.registradoEn),
      evento: punto.evento || 'intervalo',
    }));
    if (puntos.some((punto) => !Number.isFinite(punto.latitud) || punto.latitud < -90
      || punto.latitud > 90 || !Number.isFinite(punto.longitud) || punto.longitud < -180
      || punto.longitud > 180 || Number.isNaN(punto.registradoEn.getTime()))) {
      return respuesta(400, { mensaje: 'El recorrido contiene puntos inválidos' });
    }
    await recorridosRepository.insertarMuchos(puntos);
    const ultimo = puntos[puntos.length - 1];
    await ubicacionesRepository.actualizar(tecnicoId, ultimo);
    return respuesta(201, { recibidos: puntos.length });
  },

  async listarRecorrido(query, usuarioAutenticado) {
    if (![1, 2].includes(usuarioAutenticado.rolId)) {
      return respuesta(403, { mensaje: 'No tienes permisos para consultar recorridos' });
    }
    const tecnicoId = convertirId(query.tecnicoId);
    const desde = new Date(query.desde);
    const hasta = new Date(query.hasta);
    if (!tecnicoId || Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
      return respuesta(400, { mensaje: 'Se requieren técnico, fecha desde y fecha hasta válidos' });
    }
    return respuesta(200, {
      tecnicoId,
      puntos: await recorridosRepository.listar({ tecnicoId, desde, hasta }),
    });
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
