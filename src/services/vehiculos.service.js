import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const esObjeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);

// Busca el vehículo y verifica que el técnico solo acceda al que tiene asignado.
async function buscarPropio(vehiculoId, usuario) {
  const vehiculo = await vehiculosRepository.buscarPorId(aId(vehiculoId));
  if (!vehiculo) return { error: resultado(404, { mensaje: 'Vehículo no encontrado' }) };
  if (!esGestion(usuario) && vehiculo.tecnicoAsignado !== aId(usuario.id)) {
    return { error: resultado(403, { mensaje: 'No tienes acceso a este vehículo' }) };
  }
  return { vehiculo };
}

// Un vehículo solo puede asignarse a un técnico existente y activo.
async function validarTecnico(tecnicoId) {
  const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
  if (!tecnico) return resultado(400, { mensaje: 'El técnico indicado no existe' });
  if (tecnico.activo === false) return resultado(400, { mensaje: 'El técnico indicado está inactivo' });
  return null;
}

// Cada técnico tiene como máximo un vehículo: al asignarle uno, se liberan los demás.
async function liberarOtrosVehiculos(tecnicoId, vehiculoId) {
  const asignados = await vehiculosRepository.listar({ tecnicoAsignado: tecnicoId });
  await Promise.all(asignados
    .filter((vehiculo) => vehiculo.id !== vehiculoId)
    .map((vehiculo) => vehiculosRepository.actualizar(vehiculo.id, { tecnicoAsignado: null })));
}

export const vehiculosService = {
  async listar(usuario) {
    const filtro = esGestion(usuario) ? {} : { tecnicoAsignado: aId(usuario.id) };
    return resultado(200, await vehiculosRepository.listar(filtro));
  },

  async crear(body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden realizar esta acción' });
    if (!esObjeto(body) || typeof body.patente !== 'string' || !body.patente.trim()) {
      return resultado(400, { mensaje: 'La patente es obligatoria' });
    }
    const tecnicoId = body.tecnicoAsignado == null ? null : aId(body.tecnicoAsignado);
    if (body.tecnicoAsignado != null) {
      const error = await validarTecnico(tecnicoId);
      if (error) return error;
    }
    const creado = await vehiculosRepository.crear({
      ...elegir(body, ['patente', 'marca', 'modelo', 'kilometraje', 'seguro', 'ultimoService', 'detalle']),
      tecnicoAsignado: tecnicoId,
    });
    if (tecnicoId) await liberarOtrosVehiculos(tecnicoId, creado.id);
    return resultado(201, creado);
  },

  async eliminar(vehiculoId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar vehículos' });
    const eliminado = await vehiculosRepository.eliminar(aId(vehiculoId));
    return eliminado ? resultado(200, eliminado) : resultado(404, { mensaje: 'Vehículo no encontrado' });
  },

  async actualizar(vehiculoId, body, usuario) {
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const operacion = body?._operacion;
    if (!esGestion(usuario) && !['kilometraje', 'control'].includes(operacion)) {
      return resultado(403, { mensaje: 'No tienes permisos para modificar este vehículo' });
    }
    const datos = operacion === 'kilometraje'
      ? elegir(body, ['kilometraje'])
      : operacion === 'control'
        ? elegir(body, ['estado', 'kilometraje', 'fotosControl', 'controles', 'ultimoControl'])
        : elegir(body, ['patente', 'marca', 'modelo', 'seguro', 'ultimoService', 'detalle', 'enServicio']);
    if (!Object.keys(datos).length) return resultado(400, { mensaje: 'No hay campos modificables' });
    if (datos.kilometraje !== undefined && Number(datos.kilometraje) < Number(vehiculo.kilometraje?.actual)) {
      return resultado(400, { mensaje: 'El kilometraje debe ser válido y no menor al actual.' });
    }
    return resultado(200, await vehiculosRepository.actualizar(vehiculo.id, datos));
  },

  async asignar(vehiculoId, body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden asignar vehículos' });
    if (body?.tecnicoId != null && !aId(body.tecnicoId)) return resultado(400, { mensaje: 'tecnicoId inválido' });
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const tecnicoId = body?.tecnicoId == null ? null : aId(body.tecnicoId);
    if (tecnicoId) {
      const errorTecnico = await validarTecnico(tecnicoId);
      if (errorTecnico) return errorTecnico;
      await liberarOtrosVehiculos(tecnicoId, vehiculo.id);
    }
    return resultado(200, await vehiculosRepository.actualizar(vehiculo.id, {
      tecnicoAsignado: tecnicoId,
      disponible: true,
    }));
  },

  async kilometraje(vehiculoId, body, usuario) {
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const valor = Number(body?.kilometraje);
    if (!Number.isFinite(valor) || valor < Number(vehiculo.kilometraje?.actual)) {
      return resultado(400, { mensaje: 'El kilometraje debe ser válido y no menor al actual.' });
    }
    return resultado(200, await vehiculosRepository.actualizar(vehiculo.id, {
      kilometraje: { ...vehiculo.kilometraje, actual: valor, actualizadoEn: new Date().toISOString() },
    }));
  },

  async control(vehiculoId, body, usuario) {
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const kilometros = Number(body?.kilometraje);
    if (!Number.isFinite(kilometros)) return resultado(400, { mensaje: 'El kilometraje es obligatorio' });
    const control = elegir(body, ['kilometraje', 'estado', 'observaciones', 'fotosControl']);
    return resultado(200, await vehiculosRepository.actualizar(vehiculo.id, {
      kilometraje: { ...vehiculo.kilometraje, actual: kilometros },
      controles: [...(vehiculo.controles || []), control],
      ultimoControl: control,
    }));
  },
};
