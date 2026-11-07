import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { clientesRepository } from '../repositories/clientes.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { imagenesService } from './imagenes.service.js';
import { obtenerPaginacion, respuestaPaginada } from '../utils/paginacion.js';
import { JORNADA_INACTIVA, jornadaActivaDelTecnico } from '../utils/jornadaActiva.js';

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
// Lo que puede mandar cada rol. La fecha de finalización, la jornada y el vehículo los pone el backend.
const camposEstadoTecnico = ['estado', 'observaciones', 'comentarioFinalizacion', 'motivoBloqueo'];
const camposEstadoGestion = [...camposEstadoTecnico, 'notasCoordinador', 'prioridad', 'fechaProgramada'];
// Pasos que puede dar el técnico con su reclamo: comenzarlo, finalizarlo o bloquearlo.
// Reabrir, reasignar o desbloquear lo hace el coordinador.
const PASOS_DEL_TECNICO = {
  Asignado: ['En progreso', 'Bloqueado'],
  'En progreso': ['Finalizado', 'Bloqueado'],
};
const esTextoConContenido = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const CAMPOS_TEXTO = ['tipo', 'descripcion', 'observaciones', 'comentarioFinalizacion', 'motivoBloqueo', 'notasCoordinador'];
const LARGO_MAXIMO = 2000;
const esFechaValida = (valor) => typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime());

// Textos y fecha programada de un reclamo. Devuelve el mensaje de error o null.
function validarDatos(datos) {
  for (const campo of CAMPOS_TEXTO) {
    if (datos[campo] == null) continue;
    if (typeof datos[campo] !== 'string') return `El campo ${campo} debe ser texto`;
    if (datos[campo].length > LARGO_MAXIMO) return `El campo ${campo} admite hasta ${LARGO_MAXIMO} caracteres`;
  }
  if (datos.fechaProgramada != null && datos.fechaProgramada !== '' && !esFechaValida(datos.fechaProgramada)) {
    return 'La fecha programada no es válida';
  }
  return null;
}

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
// Solo se piden los clientes y técnicos de estos reclamos (no todos los de la base).
async function conRelaciones(reclamos) {
  const ids = (campo) => [...new Set(reclamos.map((reclamo) => reclamo[campo]).filter(Boolean))];
  const [clientes, tecnicos] = await Promise.all([
    clientesRepository.listar({ id: { $in: ids('clienteId') } }),
    usuariosRepository.listarPorIds(ids('tecnicoId'), { rolId: 3 }),
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
  // Sin jornada activa, el técnico recibe 403 (codigo JORNADA_INACTIVA): solo puede ver el resumen.
  async listar(usuario, { estado, tecnicoId, desde, hasta, pagina, limite } = {}) {
    if (!esGestion(usuario) && !(await jornadaActivaDelTecnico(usuario))) return resultado(403, JORNADA_INACTIVA);
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
        .map(({ id, nombre, numeroCliente, pelo, caja, zona, ubicacion }) => ({
          id, nombre, numeroCliente, pelo, caja, zona, ubicacion,
        }))
        .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es')),
      tecnicos: tecnicos
        .filter((tecnico) => tecnico.activo !== false)
        .map((tecnico) => ({ id: tecnico.id, nombre: tecnico.nombre, email: tecnico.perfil?.email }))
        .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es')),
    });
  },

  // Admin y coordinador: totales para el panel (los cuenta Mongo, no se traen los reclamos).
  // Técnico: cuántos reclamos tiene pendientes, aunque no tenga la jornada activa (solo cantidades,
  // sin datos de clientes), para la pantalla que le pide iniciar la jornada.
  async resumen(usuario) {
    if (!esGestion(usuario)) {
      const tecnicoId = aId(usuario.id);
      const [porEstado, urgentes, jornada] = await Promise.all([
        reclamosRepository.contarPorEstado({ tecnicoId }),
        reclamosRepository.contar({ tecnicoId, estado: { $in: ['Asignado', 'En progreso'] }, prioridad: 'Urgente' }),
        jornadaActivaDelTecnico(usuario),
      ]);
      return resultado(200, {
        jornadaActiva: Boolean(jornada),
        asignados: porEstado.Asignado || 0,
        enProgreso: porEstado['En progreso'] || 0,
        urgentes,
      });
    }
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
    if (cliente.activo === false) return resultado(400, { mensaje: 'El cliente está dado de baja' });
    if (typeof body.tipo !== 'string' || !body.tipo.trim()) {
      return resultado(400, { mensaje: 'El tipo de reclamo es obligatorio' });
    }
    const errorDatos = validarDatos(body);
    if (errorDatos) return resultado(400, { mensaje: errorDatos });
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
    const jornada = await jornadaActivaDelTecnico(usuario);
    if (!esGestion(usuario) && !jornada) return resultado(403, JORNADA_INACTIVA);
    const cambios = elegir(body, esGestion(usuario) ? camposEstadoGestion : camposEstadoTecnico);
    if (cambios.estado && !estadosReclamo.has(cambios.estado)) return resultado(400, { mensaje: 'Estado de reclamo inválido' });
    const errorDatos = validarDatos(cambios);
    if (errorDatos) return resultado(400, { mensaje: errorDatos });
    const cambiaDeEstado = Boolean(cambios.estado) && cambios.estado !== reclamo.estado;
    if (!esGestion(usuario)) {
      const pasosPosibles = PASOS_DEL_TECNICO[reclamo.estado];
      if (!pasosPosibles) {
        return resultado(400, { mensaje: `El reclamo está ${reclamo.estado.toLowerCase()}: ya no lo podés modificar.` });
      }
      if (cambiaDeEstado && !pasosPosibles.includes(cambios.estado)) {
        return resultado(400, { mensaje: `Un reclamo ${reclamo.estado.toLowerCase()} no puede pasar a "${cambios.estado}".` });
      }
    }
    if (cambiaDeEstado && cambios.estado === 'Bloqueado' && !esTextoConContenido(cambios.motivoBloqueo)) {
      return resultado(400, { mensaje: 'Contá el motivo del bloqueo.' });
    }
    if (cambiaDeEstado && cambios.estado === 'Finalizado') {
      if (!esGestion(usuario) && !esTextoConContenido(cambios.comentarioFinalizacion)) {
        return resultado(400, { mensaje: 'Escribí un comentario sobre el trabajo realizado.' });
      }
      cambios.finalizadoEn = new Date().toISOString();
    }
    if (!esGestion(usuario) && cambiaDeEstado && cambios.estado === 'En progreso') {
      const enProgreso = await reclamosRepository.contar({
        tecnicoId: aId(usuario.id),
        estado: 'En progreso',
      });
      if (enProgreso > 0) {
        return resultado(409, { mensaje: 'Finalizá el reclamo en progreso antes de comenzar otro.' });
      }
      // Comenzar es un solo paso: el control del vehículo se hace al iniciar y al finalizar la
      // jornada. El backend anota con qué vehículo se hizo el servicio (null si no tiene uno).
      const [vehiculo] = await vehiculosRepository.listar({ tecnicoAsignado: aId(usuario.id) });
      cambios.vehiculoId = vehiculo?.id ?? null;
    }
    // El servicio que finaliza el técnico cuenta en su jornada activa: la pone el backend, no la app.
    if (jornada && cambiaDeEstado && cambios.estado === 'Finalizado') cambios.jornadaId = jornada.id;
    if (cambios.estado === 'Bloqueado' && Object.prototype.hasOwnProperty.call(body, 'tecnicoId') && body.tecnicoId == null) {
      cambios.tecnicoId = null;
    }
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
