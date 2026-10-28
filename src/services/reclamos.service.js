import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { clientesRepository } from '../repositories/clientes.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { imagenesService } from './imagenes.service.js';
import { obtenerPaginacion, respuestaPaginada } from '../utils/paginacion.js';

const MAXIMO_IMAGENES_RECLAMO = 5;

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
const camposEstadoTecnico = [
  'estado', 'observaciones', 'finalizadoEn', 'jornadaId', 'comentarioFinalizacion',
  'motivoBloqueo', 'vehiculoId', 'inicioServicio',
];
const camposEstadoGestion = [...camposEstadoTecnico, 'notasCoordinador', 'prioridad', 'fechaProgramada'];

// Datos del técnico que viajan dentro de cada reclamo.
const tecnicoResumido = (tecnico) => (tecnico ? {
  id: tecnico.id,
  nombre: tecnico.nombre,
  usuario: tecnico.usuario,
  email: tecnico.perfil?.email,
  telefono: tecnico.perfil?.telefono,
  activo: tecnico.activo !== false,
} : null);

// Agrega a cada reclamo su cliente y su técnico, así la pantalla no los pide aparte.
async function conRelaciones(reclamos) {
  const [clientes, tecnicos] = await Promise.all([
    clientesRepository.listar(),
    usuariosRepository.listar({ rolId: 3 }),
  ]);
  const clientesPorId = new Map(clientes.map(({ passwordHash, contrasena, ...cliente }) => [cliente.id, cliente]));
  const tecnicosPorId = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico]));
  return reclamos.map((reclamo) => ({
    ...reclamo,
    cliente: clientesPorId.get(reclamo.clienteId) || null,
    tecnico: tecnicoResumido(tecnicosPorId.get(reclamo.tecnicoId)),
  }));
}
const unoConRelaciones = async (reclamo) => (await conRelaciones([reclamo]))[0];

async function validarTecnico(tecnicoId) {
  const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
  if (!tecnico) return resultado(400, { mensaje: 'El técnico indicado no existe' });
  if (tecnico.activo === false) return resultado(400, { mensaje: 'El técnico indicado está inactivo' });
  return null;
}

export const reclamosService = {
  // Filtros opcionales (los aplica Mongo):
  // - estado: 'Abierto', 'Asignado', 'En progreso', 'Bloqueado', 'Finalizado' o 'Todos'.
  // - tecnicoId: id del técnico, 'Sin asignar' o 'Todos' (solo admin y coordinador).
  // - desde / hasta: rango de la fecha de creación.
  // Admin y coordinador: del más nuevo al más viejo.
  // Técnico: en el orden en que tiene que trabajarlos (en progreso, asignados por prioridad y fecha
  // de visita, finalizados del más reciente al más viejo) y con cuántos reclamos tiene en cada estado.
  async listar(usuario, { estado, tecnicoId, desde, hasta, pagina, limite } = {}) {
    if (estado !== undefined && estado !== 'Todos' && !estadosReclamo.has(estado)) {
      return resultado(400, { mensaje: 'Estado de reclamo inválido' });
    }
    const base = esGestion(usuario) ? {} : { tecnicoId: aId(usuario.id) };
    const filtro = { ...base };
    if (estado && estado !== 'Todos') filtro.estado = estado;
    if (esGestion(usuario) && tecnicoId !== undefined && tecnicoId !== 'Todos') {
      if (tecnicoId === 'Sin asignar') filtro.tecnicoId = null;
      else if (aId(tecnicoId)) filtro.tecnicoId = aId(tecnicoId);
      else return resultado(400, { mensaje: 'tecnicoId inválido' });
    }
    const rango = {};
    for (const [clave, valor, operador] of [['desde', desde, '$gte'], ['hasta', hasta, '$lte']]) {
      if (!valor) continue;
      const fecha = new Date(valor);
      if (Number.isNaN(fecha.getTime())) return resultado(400, { mensaje: `La fecha "${clave}" no es válida` });
      rango[operador] = fecha;
    }
    if (Object.keys(rango).length) filtro.creadoEn = rango;

    const paginacion = obtenerPaginacion({ pagina, limite });
    const [paginaReclamos, totalesPorEstado] = await Promise.all([
      esGestion(usuario)
        ? reclamosRepository.listarPaginado(filtro, paginacion, { id: -1 })
        : reclamosRepository.listarPaginadoParaTecnico(filtro, paginacion),
      esGestion(usuario) ? null : reclamosRepository.contarPorEstado(base),
    ]);
    return resultado(200, respuestaPaginada(
      await conRelaciones(paginaReclamos.datos),
      paginaReclamos.total,
      paginacion,
      totalesPorEstado ? { totalesPorEstado } : {},
    ));
  },

  // Listas de los formularios ("Nuevo reclamo" y "Asignar técnico"): solo clientes y técnicos
  // activos, con los campos que muestran los selectores.
  async opciones() {
    const [clientes, tecnicos] = await Promise.all([
      clientesRepository.listar({ activo: { $ne: false } }),
      usuariosRepository.listar({ rolId: 3 }),
    ]);
    return resultado(200, {
      clientes: clientes
        .map(({ id, nombre, zona }) => ({ id, nombre, zona }))
        .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es')),
      tecnicos: tecnicos
        .filter((tecnico) => tecnico.activo !== false)
        .map((tecnico) => ({ id: tecnico.id, nombre: tecnico.nombre, email: tecnico.perfil?.email }))
        .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es')),
    });
  },

  // Totales para el panel: los cuenta Mongo, no se traen los reclamos.
  async resumen() {
    const [pendientes, serviciosGestionados] = await Promise.all([
      reclamosRepository.contar({ estado: { $ne: 'Finalizado' } }),
      reclamosRepository.contar({ $or: [{ esOrden: true }, { tipo: { $in: ['Instalación', 'Baja de servicio'] } }] }),
    ]);
    return resultado(200, { pendientes, serviciosGestionados });
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
    return resultado(201, await unoConRelaciones(await reclamosRepository.crear({
      ...elegir(body, ['descripcion', 'fechaProgramada', 'ubicacion']),
      clienteId: cliente.id,
      tipo: body.tipo.trim(),
      prioridad: body.prioridad || 'Normal',
      agrupacionGeografica: body.agrupacionGeografica || cliente.zona || '',
      esOrden: body.esOrden === true,
      tecnicoId,
      estado: tecnicoId ? 'Asignado' : 'Abierto',
      creadoEn: new Date().toISOString(),
    })));
  },

  async eliminar(reclamoId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar reclamos' });
    const eliminado = await reclamosRepository.eliminar(aId(reclamoId));
    if (!eliminado) return resultado(404, { mensaje: 'Reclamo no encontrado' });
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
    return resultado(200, await unoConRelaciones(await reclamosRepository.actualizar(reclamo.id, {
      tecnicoId,
      estado: tecnicoId ? 'Asignado' : 'Abierto',
    })));
  },

  async estado(reclamoId, body, usuario) {
    const reclamo = await reclamosRepository.buscarPorId(aId(reclamoId));
    if (!reclamo) return resultado(404, { mensaje: 'Reclamo no encontrado' });
    if (!esGestion(usuario) && reclamo.tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes actualizar reclamos asignados a ti' });
    }
    const cambios = elegir(body, esGestion(usuario) ? camposEstadoGestion : camposEstadoTecnico);
    if (cambios.inicioServicio !== undefined) {
      if (!esObjeto(cambios.inicioServicio)) return resultado(400, { mensaje: 'El control de inicio no es válido' });
      cambios.inicioServicio = elegir(cambios.inicioServicio, ['kilometraje', 'litros', 'estado', 'imagenes']);
      if (cambios.inicioServicio.imagenes !== undefined) {
        const error = await imagenesService.validarReferencias(cambios.inicioServicio.imagenes, usuario, { maximo: 4 });
        if (error) return resultado(400, { mensaje: error });
      }
    }
    if (cambios.estado === 'Bloqueado' && Object.prototype.hasOwnProperty.call(body, 'tecnicoId') && body.tecnicoId == null) {
      cambios.tecnicoId = null;
    }
    if (cambios.estado && !estadosReclamo.has(cambios.estado)) return resultado(400, { mensaje: 'Estado de reclamo inválido' });
    if (cambios.prioridad && !prioridadesReclamo.has(cambios.prioridad)) return resultado(400, { mensaje: 'Prioridad inválida' });

    const imagenesActuales = reclamo.imagenes || [];
    const traeImagenes = Object.prototype.hasOwnProperty.call(body, 'imagenes');
    if (traeImagenes) {
      const cantidadNueva = Array.isArray(body.imagenes) ? body.imagenes.length : 0;
      if (imagenesActuales.length + cantidadNueva > MAXIMO_IMAGENES_RECLAMO) {
        return resultado(400, { mensaje: `Podés adjuntar hasta ${MAXIMO_IMAGENES_RECLAMO} imágenes por reclamo.` });
      }
      const error = await imagenesService.validarReferencias(body.imagenes, usuario, { minimo: 1 });
      if (error) return resultado(400, { mensaje: error });
      cambios.imagenes = [...imagenesActuales, ...body.imagenes];
    }
    if (cambios.estado === 'Finalizado' && !(cambios.imagenes || imagenesActuales).length) {
      return resultado(400, { mensaje: 'Adjuntá al menos una imagen del trabajo para finalizar.' });
    }
    if (!Object.keys(cambios).length) return resultado(400, { mensaje: 'No hay campos modificables' });
    return resultado(200, await unoConRelaciones(await reclamosRepository.actualizar(reclamo.id, cambios)));
  },
};
