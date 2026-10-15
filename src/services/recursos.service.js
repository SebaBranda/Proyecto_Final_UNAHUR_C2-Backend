import { clientesRepository } from '../repositories/clientes.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { vehiculosRepository, reclamosRepository, jornadasRepository } from '../repositories/recursos.repository.js';

const broad = (u) => [1, 2].includes(u.rolId);
const id = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const okBody = (v) => v && typeof v === 'object' && !Array.isArray(v);
const result = (status, body) => ({ status, body });
const pick = (body, fields) => Object.fromEntries(
  fields.filter((field) => Object.prototype.hasOwnProperty.call(body || {}, field))
    .map((field) => [field, body[field]]),
);
const estadosReclamo = new Set(['Abierto', 'Asignado', 'En progreso', 'Bloqueado', 'Finalizado']);
const prioridadesReclamo = new Set(['Normal', 'Alta', 'Urgente']);
// Campos que cada rol puede modificar en PATCH /reclamos/:id/estado.
const camposEstadoTecnico = [
  'estado', 'observaciones', 'finalizadoEn', 'jornadaId', 'comentarioFinalizacion',
  'motivoBloqueo', 'vehiculoId', 'inicioServicio', 'imagen', 'imagenes',
];
const camposEstadoGestion = [...camposEstadoTecnico, 'notasCoordinador', 'prioridad', 'fechaProgramada'];

export const vehiculosService = {
  async listar(user) {
    const list = await vehiculosRepository.listar(broad(user) ? {} : { tecnicoAsignado: id(user.id) });
    return result(200, list);
  },
  async crear(body, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden realizar esta acción' });
    if (!okBody(body) || typeof body.patente !== 'string' || !body.patente.trim()) {
      return result(400, { mensaje: 'La patente es obligatoria' });
    }
    const tecnicoId = body.tecnicoAsignado == null ? null : id(body.tecnicoAsignado);
    if (body.tecnicoAsignado != null) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    const creado = await vehiculosRepository.crear({
      ...pick(body, ['patente', 'marca', 'modelo', 'kilometraje', 'seguro', 'ultimoService', 'detalle']),
      tecnicoAsignado: tecnicoId,
    });
    if (tecnicoId) await liberarOtrosVehiculos(tecnicoId, creado.id);
    return result(201, creado);
  },
  async eliminar(resourceId, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden eliminar vehículos' });
    const deleted = await vehiculosRepository.eliminar(id(resourceId));
    return deleted ? result(200, deleted) : result(404, { mensaje: 'Vehículo no encontrado' });
  },
  async actualizar(resourceId, body, user) {
    const current = await own(resourceId, user, vehiculosRepository, 'tecnicoAsignado');
    if (current.error) return current.error;
    if (!broad(user) && !['kilometraje', 'control'].includes(body?._operacion)) return result(403, { mensaje: 'No tienes permisos para modificar este vehículo' });
    const operacion = body?._operacion;
    const data = operacion === 'kilometraje'
      ? pick(body, ['kilometraje'])
      : operacion === 'control'
        ? pick(body, ['estado', 'kilometraje', 'fotosControl', 'controles', 'ultimoControl'])
        : pick(body, ['patente', 'marca', 'modelo', 'seguro', 'ultimoService', 'detalle', 'enServicio']);
    if (!Object.keys(data).length) return result(400, { mensaje: 'No hay campos modificables' });
    if (!broad(user) && !['kilometraje', 'control'].includes(operacion)) return result(403, { mensaje: 'No tienes permisos para modificar este vehículo' });
    if (data.kilometraje !== undefined && Number(data.kilometraje) < Number(current.item.kilometraje?.actual)) return result(400, { mensaje: 'El kilometraje debe ser válido y no menor al actual.' });
    return result(200, await vehiculosRepository.actualizar(current.item.id, data));
  },
  async asignar(resourceId, body, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden asignar vehículos' });
    if (body?.tecnicoId != null && !id(body.tecnicoId)) return result(400, { mensaje: 'tecnicoId inválido' });
    const current = await own(resourceId, user, vehiculosRepository, 'tecnicoAsignado', 'Vehículo');
    if (current.error) return current.error;
    const tecnicoId = body?.tecnicoId == null ? null : id(body.tecnicoId);
    if (tecnicoId) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
      await liberarOtrosVehiculos(tecnicoId, current.item.id);
    }
    return result(200, await vehiculosRepository.actualizar(current.item.id, {
      tecnicoAsignado: tecnicoId,
      disponible: true,
    }));
  },
  async kilometraje(resourceId, body, user) {
    const current = await own(resourceId, user, vehiculosRepository, 'tecnicoAsignado');
    if (current.error) return current.error;
    const value = Number(body?.kilometraje);
    if (!Number.isFinite(value) || value < Number(current.item.kilometraje?.actual)) return result(400, { mensaje: 'El kilometraje debe ser válido y no menor al actual.' });
    return result(200, await vehiculosRepository.actualizar(current.item.id, {
      kilometraje: { ...current.item.kilometraje, actual: value, actualizadoEn: new Date().toISOString() },
    }));
  },
  async control(resourceId, body, user) {
    const current = await own(resourceId, user, vehiculosRepository, 'tecnicoAsignado');
    if (current.error) return current.error;
    const km = Number(body?.kilometraje);
    if (!Number.isFinite(km)) return result(400, { mensaje: 'El kilometraje es obligatorio' });
    const control = pick(body, ['kilometraje', 'estado', 'observaciones', 'fotosControl']);
    return result(200, await vehiculosRepository.actualizar(current.item.id, {
      kilometraje: { ...current.item.kilometraje, actual: km },
      controles: [...(current.item.controles || []), control],
      ultimoControl: control,
    }));
  },
};

export const reclamosService = {
  async listar(user) {
    const list = await reclamosRepository.listar(broad(user) ? {} : { tecnicoId: id(user.id) });
    if (!broad(user)) {
      const clientes = await clientesRepository.listar();
      const permitidos = new Set(list.map((r) => r.clienteId));
      return result(200, clientes.filter((c) => permitidos.has(c.id)).length >= 0 ? list : []);
    }
    return result(200, list);
  },
  async crear(body, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden crear reclamos' });
    if (!okBody(body) || !id(body.clienteId)) return result(400, { mensaje: 'Se requiere clienteId' });
    const cliente = await clientesRepository.buscarPorId(id(body.clienteId));
    if (!cliente) return result(400, { mensaje: 'El cliente no existe' });
    if (typeof body.tipo !== 'string' || !body.tipo.trim()) return result(400, { mensaje: 'El tipo de reclamo es obligatorio' });
    if (body.prioridad != null && !prioridadesReclamo.has(body.prioridad)) return result(400, { mensaje: 'Prioridad inválida' });
    const sinTecnico = body.tecnicoId == null || body.tecnicoId === '';
    const tecnicoId = sinTecnico ? null : id(body.tecnicoId);
    if (!sinTecnico) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    return result(201, await reclamosRepository.crear({
      ...pick(body, ['descripcion', 'fechaProgramada', 'ubicacion']),
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
  async eliminar(resourceId, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden eliminar reclamos' });
    const deleted = await reclamosRepository.eliminar(id(resourceId));
    return deleted ? result(200, deleted) : result(404, { mensaje: 'Reclamo no encontrado' });
  },
  async asignar(resourceId, body, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden asignar reclamos' });
    const tecnicoId = body?.tecnicoId == null ? null : id(body.tecnicoId);
    if (body?.tecnicoId != null && !tecnicoId) return result(400, { mensaje: 'tecnicoId inválido' });
    const item = await reclamosRepository.buscarPorId(id(resourceId));
    if (!item) return result(404, { mensaje: 'Reclamo no encontrado' });
    if (tecnicoId) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    return result(200, await reclamosRepository.actualizar(item.id, { tecnicoId, estado: tecnicoId ? 'Asignado' : 'Abierto' }));
  },
  async estado(resourceId, body, user) {
    const item = await reclamosRepository.buscarPorId(id(resourceId));
    if (!item) return result(404, { mensaje: 'Reclamo no encontrado' });
    if (!broad(user) && item.tecnicoId !== id(user.id)) return result(403, { mensaje: 'Solo puedes actualizar reclamos asignados a ti' });
    const cambios = pick(body, broad(user) ? camposEstadoGestion : camposEstadoTecnico);
    // Al reportar un inconveniente, el técnico libera el reclamo para que se reasigne.
    if (cambios.estado === 'Bloqueado' && Object.prototype.hasOwnProperty.call(body, 'tecnicoId') && body.tecnicoId == null) {
      cambios.tecnicoId = null;
    }
    if (cambios.estado && !estadosReclamo.has(cambios.estado)) return result(400, { mensaje: 'Estado de reclamo inválido' });
    if (cambios.prioridad && !prioridadesReclamo.has(cambios.prioridad)) return result(400, { mensaje: 'Prioridad inválida' });
    if (!Object.keys(cambios).length) return result(400, { mensaje: 'No hay campos modificables' });
    return result(200, await reclamosRepository.actualizar(item.id, cambios));
  },
};

export const jornadasService = {
  async listar(user) { return result(200, await jornadasRepository.listar(broad(user) ? {} : { tecnicoId: id(user.id) })); },
  async crear(body, user) {
    const tecnicoId = id(body?.tecnicoId) || id(user.id);
    if (!broad(user) && tecnicoId !== id(user.id)) return result(403, { mensaje: 'Solo puedes iniciar tu propia jornada' });
    return result(201, await jornadasRepository.crear({
      tecnicoId,
      activa: true,
      inicio: new Date().toISOString(),
      controlInicial: pick(body, ['kilometrajeInicial', 'observaciones']),
    }));
  },
  async finalizar(resourceId, body, user) {
    const item = await jornadasRepository.buscarPorId(id(resourceId));
    if (!item) return result(404, { mensaje: 'Jornada no encontrada' });
    if (!broad(user) && item.tecnicoId !== id(user.id)) return result(403, { mensaje: 'Solo puedes finalizar tu propia jornada' });
    return result(200, await jornadasRepository.actualizar(item.id, {
      fin: new Date().toISOString(),
      activa: false,
      controlFinal: pick(body, ['kilometrajeFinal', 'observaciones']),
    }));
  },
  async eliminar(resourceId, user) {
    if (!broad(user)) return result(403, { mensaje: 'Solo admin o coordinador pueden eliminar jornadas' });
    const deleted = await jornadasRepository.eliminar(id(resourceId));
    return deleted ? result(200, deleted) : result(404, { mensaje: 'Jornada no encontrada' });
  },
};

// Un vehículo solo puede asignarse a un técnico existente y activo.
async function validarTecnico(tecnicoId) {
  const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
  if (!tecnico) return result(400, { mensaje: 'El técnico indicado no existe' });
  if (tecnico.activo === false) return result(400, { mensaje: 'El técnico indicado está inactivo' });
  return null;
}

// Cada técnico tiene como máximo un vehículo: al asignarle uno, se liberan los demás.
async function liberarOtrosVehiculos(tecnicoId, vehiculoId) {
  const asignados = await vehiculosRepository.listar({ tecnicoAsignado: tecnicoId });
  await Promise.all(asignados
    .filter((vehiculo) => vehiculo.id !== vehiculoId)
    .map((vehiculo) => vehiculosRepository.actualizar(vehiculo.id, { tecnicoAsignado: null })));
}

async function own(resourceId, user, repository, ownerField, label = 'Recurso') {
  const item = await repository.buscarPorId(id(resourceId));
  if (!item) return { error: result(404, { mensaje: `${label} no encontrado` }) };
  if (!broad(user) && item[ownerField] !== id(user.id)) return { error: result(403, { mensaje: `No tienes acceso a este ${label.toLowerCase()}` }) };
  return { item };
}
async function mutate(allowed, body, repository, label) {
  if (!allowed) return result(403, { mensaje: 'Solo admin o coordinador pueden realizar esta acción' });
  if (!okBody(body)) return result(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
  return result(201, await repository.crear(body));
}
