import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import {
  obtenerPaginacion, regexDeBusqueda, respuestaPaginada, textoDeBusqueda,
} from '../utils/paginacion.js';

const FILTRO_POR_ASIGNACION = {
  Todos: {},
  'Con técnico': { tecnicoAsignado: { $ne: null } },
  'Sin técnico': { tecnicoAsignado: null },
};
import { imagenesService } from './imagenes.service.js';
import { validarNivelCombustible } from '../utils/combustible.js';

const MAXIMO_IMAGENES_CONTROL = 4;

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const esObjeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);
const DIAS_HISTORIAL = 30;
const MILISEGUNDOS_DIA = 24 * 60 * 60 * 1000;
const limiteHistorial = () => Date.now() - (DIAS_HISTORIAL * MILISEGUNDOS_DIA);
const controlesVigentes = (controles = []) => controles.filter((registro) => {
  const fecha = new Date(registro.fechaControl || registro.fecha || 0).getTime();
  return Number.isFinite(fecha) && fecha >= limiteHistorial();
});

// Datos del técnico que viajan dentro de cada vehículo.
const tecnicoResumido = (tecnico) => (tecnico ? {
  id: tecnico.id,
  nombre: tecnico.nombre,
  usuario: tecnico.usuario,
  activo: tecnico.activo !== false,
} : null);

// Agrega a cada vehículo su técnico asignado (un solo pedido a la base para todos).
async function conTecnico(vehiculos) {
  const ids = [...new Set(vehiculos.map((vehiculo) => vehiculo.tecnicoAsignado).filter(Boolean))];
  const tecnicos = await usuariosRepository.listarPorIds(ids, { rolId: 3 });
  const porId = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico]));
  return vehiculos.map((vehiculo) => ({
    ...vehiculo,
    tecnico: tecnicoResumido(porId.get(vehiculo.tecnicoAsignado)),
  }));
}
const unoConTecnico = async (vehiculo) => (await conTecnico([vehiculo]))[0];

const esTextoOVacio = (valor) => valor == null || typeof valor === 'string';
const esFechaOVacia = (valor) => valor == null || valor === ''
  || (typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime()));

// Valida los datos que admin y coordinador pueden editar. Devuelve el mensaje de error o null.
function validarDatosEditables({ seguro, ultimoService, detalle, enServicio }) {
  if (seguro !== undefined) {
    if (!esObjeto(seguro)) return 'El seguro debe ser un objeto con compania, poliza y vence';
    if (!esTextoOVacio(seguro.compania) || !esTextoOVacio(seguro.poliza)) return 'La compañía y la póliza deben ser texto';
    if (!esFechaOVacia(seguro.vence)) return 'El vencimiento del seguro no es una fecha válida';
  }
  if (!esFechaOVacia(ultimoService)) return 'La fecha del último service no es válida';
  if (!esTextoOVacio(detalle)) return 'El detalle debe ser texto';
  if (detalle && detalle.length > 1000) return 'El detalle admite hasta 1000 caracteres';
  if (enServicio !== undefined && typeof enServicio !== 'boolean') return 'enServicio debe ser true o false';
  return null;
}

async function buscarPropio(vehiculoId, usuario) {
  const vehiculo = await vehiculosRepository.buscarPorId(aId(vehiculoId));
  if (!vehiculo) return { error: resultado(404, { mensaje: 'Vehículo no encontrado' }) };
  if (!esGestion(usuario) && vehiculo.tecnicoAsignado !== aId(usuario.id)) {
    return { error: resultado(403, { mensaje: 'No tienes acceso a este vehículo' }) };
  }
  return { vehiculo };
}

async function validarTecnico(tecnicoId) {
  const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
  if (!tecnico) return resultado(400, { mensaje: 'El técnico indicado no existe' });
  if (tecnico.activo === false) return resultado(400, { mensaje: 'El técnico indicado está inactivo' });
  return null;
}

async function liberarOtrosVehiculos(tecnicoId, vehiculoId) {
  const asignados = await vehiculosRepository.listar({ tecnicoAsignado: tecnicoId });
  await Promise.all(asignados
    .filter((vehiculo) => vehiculo.id !== vehiculoId)
    .map((vehiculo) => vehiculosRepository.actualizar(vehiculo.id, { tecnicoAsignado: null })));
}

export const vehiculosService = {
  // Filtros opcionales: buscar (patente, marca, modelo o nombre del técnico) y
  // asignacion (Todos, Con técnico, Sin técnico). Ordena por patente.
  async listar(usuario, query = {}) {
    const asignacion = query.asignacion || 'Todos';
    if (!FILTRO_POR_ASIGNACION[asignacion]) {
      return resultado(400, { mensaje: 'La asignación debe ser Todos, Con técnico o Sin técnico' });
    }
    const filtro = esGestion(usuario)
      ? { ...FILTRO_POR_ASIGNACION[asignacion] }
      : { tecnicoAsignado: aId(usuario.id) };
    const texto = textoDeBusqueda(query.buscar);
    if (texto && esGestion(usuario)) {
      const regex = regexDeBusqueda(texto);
      filtro.$or = [
        { patente: regex },
        { marca: regex },
        { modelo: regex },
        { tecnicoAsignado: { $in: await usuariosRepository.idsPorNombre(regex, { rolId: 3 }) } },
      ];
    }
    const paginacion = obtenerPaginacion(query);
    const pagina = await vehiculosRepository.listarPaginado(filtro, paginacion, { patente: 1, id: 1 });
    const vehiculos = await conTecnico(pagina.datos.map((vehiculo) => ({
      ...vehiculo,
      controles: controlesVigentes(vehiculo.controles),
    })));
    return resultado(200, respuestaPaginada(vehiculos, pagina.total, paginacion));
  },

  // Lista del diálogo "Asignar técnico": solo técnicos activos, con id, nombre y su vehículo actual
  // (para avisar que lo pierde, aunque ese vehículo no esté en la página que se ve).
  async opciones() {
    const [tecnicos, asignados] = await Promise.all([
      usuariosRepository.listar({ rolId: 3 }),
      vehiculosRepository.listar({ tecnicoAsignado: { $ne: null } }),
    ]);
    return resultado(200, {
      tecnicos: tecnicos
        .filter((tecnico) => tecnico.activo !== false)
        .map(({ id, nombre }) => {
          const vehiculo = asignados.find((item) => item.tecnicoAsignado === id);
          return { id, nombre, vehiculo: vehiculo ? { id: vehiculo.id, patente: vehiculo.patente } : null };
        })
        .sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, 'es')),
    });
  },

  async crear(body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden realizar esta acción' });
    if (!esObjeto(body) || typeof body.patente !== 'string' || !body.patente.trim()) {
      return resultado(400, { mensaje: 'La patente es obligatoria' });
    }
    // La patente es única: se compara sin espacios, guiones ni mayúsculas ("AB 123 CD" = "ab123cd").
    const normalizar = (patente) => String(patente ?? '').replace(/[\s-]/g, '').toUpperCase();
    const patentes = (await vehiculosRepository.listar()).map((vehiculo) => normalizar(vehiculo.patente));
    if (patentes.includes(normalizar(body.patente))) {
      return resultado(400, { mensaje: 'Ya existe un vehículo con esa patente' });
    }
    const errorDatos = validarDatosEditables(body);
    if (errorDatos) return resultado(400, { mensaje: errorDatos });
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
    return resultado(201, await unoConTecnico(creado));
  },

  async eliminar(vehiculoId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar vehículos' });
    const eliminado = await vehiculosRepository.eliminar(aId(vehiculoId));
    return eliminado ? resultado(200, eliminado) : resultado(404, { mensaje: 'Vehículo no encontrado' });
  },

  // Admin y coordinador solo pueden modificar el seguro, el último service, el detalle y si está
  // en servicio. Patente, marca y modelo no se editan; el kilometraje cambia solo con
  // PATCH /vehiculos/:id/kilometraje o con un control, que validan que no baje.
  async actualizar(vehiculoId, body, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'No tienes permisos para modificar este vehículo' });
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const datos = elegir(body, ['seguro', 'ultimoService', 'detalle', 'enServicio']);
    if (!Object.keys(datos).length) return resultado(400, { mensaje: 'No hay campos modificables' });
    const errorDatos = validarDatosEditables(datos);
    if (errorDatos) return resultado(400, { mensaje: errorDatos });
    if (datos.seguro) datos.seguro = elegir(datos.seguro, ['compania', 'poliza', 'vence']);
    return resultado(200, await unoConTecnico(await vehiculosRepository.actualizar(vehiculo.id, datos)));
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
    return resultado(200, await unoConTecnico(await vehiculosRepository.actualizar(vehiculo.id, {
      tecnicoAsignado: tecnicoId,
      disponible: true,
    })));
  },

  async kilometraje(vehiculoId, body, usuario) {
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const valor = Number(body?.kilometraje);
    if (!Number.isFinite(valor) || valor < Number(vehiculo.kilometraje?.actual)) {
      return resultado(400, { mensaje: 'El kilometraje debe ser válido y no menor al actual.' });
    }
    return resultado(200, await unoConTecnico(await vehiculosRepository.actualizar(vehiculo.id, {
      kilometraje: { ...vehiculo.kilometraje, actual: valor, actualizadoEn: new Date().toISOString() },
    })));
  },

  async control(vehiculoId, body, usuario) {
    const { vehiculo, error } = await buscarPropio(vehiculoId, usuario);
    if (error) return error;
    const kilometros = Number(body?.kilometraje);
    const kilometrajeActual = Number(vehiculo.kilometraje?.actual) || 0;
    if (body?.kilometraje == null || body.kilometraje === '' || !Number.isFinite(kilometros)) {
      return resultado(400, { mensaje: 'El kilometraje es obligatorio' });
    }
    if (kilometros < kilometrajeActual) {
      return resultado(400, { mensaje: `El kilometraje no puede ser menor al actual del vehículo (${kilometrajeActual} km).` });
    }
    if (!validarNivelCombustible(body?.nivelCombustible)) {
      return resultado(400, { mensaje: 'El nivel de combustible debe ser 1/4, 1/2, 3/4 o 1.' });
    }
    if (body?.imagenes !== undefined) {
      const errorImagenes = await imagenesService.validarReferencias(body.imagenes, usuario, {
        maximo: MAXIMO_IMAGENES_CONTROL,
      });
      if (errorImagenes) return resultado(400, { mensaje: errorImagenes });
    }
    const control = {
      ...elegir(body, ['nivelCombustible', 'estado', 'observaciones', 'imagenes']),
      kilometraje: kilometros,
      fechaControl: new Date().toISOString(),
      // Quién cargó el control (lo muestra el reporte de controles de vehículos).
      registradoPor: aId(usuario.id),
    };
    const controles = controlesVigentes(vehiculo.controles);
    return resultado(200, await unoConTecnico(await vehiculosRepository.actualizar(vehiculo.id, {
      kilometraje: { ...vehiculo.kilometraje, actual: kilometros },
      controles: [...controles, control],
      ultimoControl: control,
    })));
  },
};
