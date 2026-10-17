import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { clientesRepository } from '../repositories/clientes.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { evidenciasService, validarEvidencias } from './evidencias.service.js';

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const esObjeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);

const estadosReclamo = new Set(['Abierto', 'Asignado', 'En progreso', 'Bloqueado', 'Finalizado']);
const prioridadesReclamo = new Set(['Normal', 'Alta', 'Urgente']);
// Campos que cada rol puede modificar en PATCH /reclamos/:id/estado.
const camposEstadoTecnico = [
  'estado', 'observaciones', 'finalizadoEn', 'jornadaId', 'comentarioFinalizacion',
  'motivoBloqueo', 'vehiculoId', 'inicioServicio',
];
const camposEstadoGestion = [...camposEstadoTecnico, 'notasCoordinador', 'prioridad', 'fechaProgramada'];

// Un reclamo solo puede asignarse a un técnico existente y activo.
async function validarTecnico(tecnicoId) {
  const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
  if (!tecnico) return resultado(400, { mensaje: 'El técnico indicado no existe' });
  if (tecnico.activo === false) return resultado(400, { mensaje: 'El técnico indicado está inactivo' });
  return null;
}

export const reclamosService = {
  async listar(usuario) {
    const filtro = esGestion(usuario) ? {} : { tecnicoId: aId(usuario.id) };
    return resultado(200, await reclamosRepository.listar(filtro));
  },

  async crear(body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden crear reclamos' });
    if (!esObjeto(body) || !aId(body.clienteId)) return resultado(400, { mensaje: 'Se requiere clienteId' });
    const cliente = await clientesRepository.buscarPorId(aId(body.clienteId));
    if (!cliente) return resultado(400, { mensaje: 'El cliente no existe' });
    if (typeof body.tipo !== 'string' || !body.tipo.trim()) {
      return resultado(400, { mensaje: 'El tipo de reclamo es obligatorio' });
    }
    if (body.prioridad != null && !prioridadesReclamo.has(body.prioridad)) {
      return resultado(400, { mensaje: 'Prioridad inválida' });
    }
    const sinTecnico = body.tecnicoId == null || body.tecnicoId === '';
    const tecnicoId = sinTecnico ? null : aId(body.tecnicoId);
    if (!sinTecnico) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    return resultado(201, await reclamosRepository.crear({
      ...elegir(body, ['descripcion', 'fechaProgramada', 'ubicacion']),
      clienteId: cliente.id,
      tipo: body.tipo.trim(),
      prioridad: body.prioridad || 'Normal',
      agrupacionGeografica: body.agrupacionGeografica || cliente.zona || '',
      esOrden: body.esOrden === true,
      tecnicoId,
      estado: tecnicoId ? 'Asignado' : 'Abierto',
      creadoEn: new Date().toISOString(),
    }));
  },

  async eliminar(reclamoId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar reclamos' });
    const eliminado = await reclamosRepository.eliminar(aId(reclamoId));
    if (!eliminado) return resultado(404, { mensaje: 'Reclamo no encontrado' });
    await evidenciasService.eliminarDeReclamo(eliminado.id);
    return resultado(200, eliminado);
  },

  async asignar(reclamoId, body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden asignar reclamos' });
    const tecnicoId = body?.tecnicoId == null ? null : aId(body.tecnicoId);
    if (body?.tecnicoId != null && !tecnicoId) return resultado(400, { mensaje: 'tecnicoId inválido' });
    const reclamo = await reclamosRepository.buscarPorId(aId(reclamoId));
    if (!reclamo) return resultado(404, { mensaje: 'Reclamo no encontrado' });
    if (tecnicoId) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    return resultado(200, await reclamosRepository.actualizar(reclamo.id, {
      tecnicoId,
      estado: tecnicoId ? 'Asignado' : 'Abierto',
    }));
  },

  async estado(reclamoId, body, usuario) {
    const reclamo = await reclamosRepository.buscarPorId(aId(reclamoId));
    if (!reclamo) return resultado(404, { mensaje: 'Reclamo no encontrado' });
    if (!esGestion(usuario) && reclamo.tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes actualizar reclamos asignados a ti' });
    }
    const cambios = elegir(body, esGestion(usuario) ? camposEstadoGestion : camposEstadoTecnico);
    // Al reportar un inconveniente, el técnico libera el reclamo para que se reasigne.
    if (cambios.estado === 'Bloqueado' && Object.prototype.hasOwnProperty.call(body, 'tecnicoId') && body.tecnicoId == null) {
      cambios.tecnicoId = null;
    }
    if (cambios.estado && !estadosReclamo.has(cambios.estado)) return resultado(400, { mensaje: 'Estado de reclamo inválido' });
    if (cambios.prioridad && !prioridadesReclamo.has(cambios.prioridad)) return resultado(400, { mensaje: 'Prioridad inválida' });

    // Fotos de evidencia: se validan antes de tocar el reclamo y se guardan aparte.
    const cantidadActual = reclamo.cantidadEvidencias || 0;
    const traeEvidencias = Object.prototype.hasOwnProperty.call(body, 'evidencias');
    if (traeEvidencias) {
      const error = validarEvidencias(body.evidencias, cantidadActual);
      if (error) return resultado(400, { mensaje: error });
    }
    if (cambios.estado === 'Finalizado' && !traeEvidencias && !cantidadActual) {
      return resultado(400, { mensaje: 'Adjuntá al menos una foto del trabajo para finalizar.' });
    }
    if (!Object.keys(cambios).length && !traeEvidencias) return resultado(400, { mensaje: 'No hay campos modificables' });
    if (traeEvidencias) {
      await evidenciasService.guardar(reclamo.id, body.evidencias, usuario.id);
      cambios.cantidadEvidencias = cantidadActual + body.evidencias.length;
    }
    return resultado(200, await reclamosRepository.actualizar(reclamo.id, cambios));
  },

  async evidencias(reclamoId, usuario) {
    const reclamo = await reclamosRepository.buscarPorId(aId(reclamoId));
    if (!reclamo || (!esGestion(usuario) && reclamo.tecnicoId !== aId(usuario.id))) {
      return resultado(404, { mensaje: 'Reclamo no encontrado' });
    }
    return resultado(200, await evidenciasService.listar(reclamo.id));
  },
};
