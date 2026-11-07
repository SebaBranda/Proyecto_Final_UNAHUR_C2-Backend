import { clientesRepository } from '../repositories/clientes.repository.js';
import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { JORNADA_INACTIVA, jornadaActivaDelTecnico } from '../utils/jornadaActiva.js';
import {
  obtenerPaginacion, regexDeBusqueda, respuestaPaginada, textoDeBusqueda,
} from '../utils/paginacion.js';

const CAMPOS_BUSQUEDA = ['nombre', 'numeroCliente', 'pelo', 'caja', 'documento', 'telefono', 'email', 'direccion', 'ubicacion'];
const FORMATO_NUMERO_CLIENTE = /^[A-Za-z0-9]+(?:[./-][A-Za-z0-9]+)*$/;
const FILTRO_POR_ESTADO = { Todos: {}, Activos: { activo: { $ne: false } }, Inactivos: { activo: false } };

export const clientesService = {
  // Filtros opcionales: buscar (nombre, DNI, teléfono, correo o domicilio) y estado (Todos, Activos, Inactivos).
  async listar(usuarioAutenticado, query = {}) {
    const paginacion = obtenerPaginacion(query);
    const estado = query.estado || 'Todos';
    if (!FILTRO_POR_ESTADO[estado]) return respuesta(400, { mensaje: 'El estado debe ser Todos, Activos o Inactivos' });
    const filtro = { ...FILTRO_POR_ESTADO[estado] };
    if (usuarioAutenticado?.rolId === 3) {
      if (!(await jornadaActivaDelTecnico(usuarioAutenticado))) return respuesta(403, JORNADA_INACTIVA);
      const reclamos = await reclamosRepository.listar({ tecnicoId: Number(usuarioAutenticado.id) });
      filtro.id = { $in: [...new Set(reclamos.map((reclamo) => reclamo.clienteId))] };
    }
    const texto = textoDeBusqueda(query.buscar);
    if (texto) {
      const regex = regexDeBusqueda(texto);
      filtro.$or = CAMPOS_BUSQUEDA.map((campo) => ({ [campo]: regex }));
    }
    const pagina = await clientesRepository.listarPaginado(filtro, paginacion, { nombre: 1, id: 1 });
    return respuesta(200, respuestaPaginada(pagina.datos.map(serializarCliente), pagina.total, paginacion));
  },

  async obtener(idParametro, usuarioAutenticado) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();

    const cliente = await clientesRepository.buscarPorId(id);
    if (!cliente) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    if (usuarioAutenticado?.rolId === 3) {
      if (!(await jornadaActivaDelTecnico(usuarioAutenticado))) return respuesta(403, JORNADA_INACTIVA);
      const reclamos = await reclamosRepository.listar({ tecnicoId: Number(usuarioAutenticado.id) });
      if (!reclamos.some((reclamo) => reclamo.clienteId === id)) {
        return respuesta(403, { mensaje: 'No tienes acceso a este cliente' });
      }
    }
    return respuesta(200, serializarCliente(cliente));
  },

  async crear(cuerpo) {
    if (!esObjeto(cuerpo)) {
      return respuesta(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
    }
    if (typeof cuerpo.nombre !== 'string' || cuerpo.nombre.trim().length === 0) {
      return respuesta(400, { mensaje: 'Se requieren los campos: nombre' });
    }
    const numeroCliente = validarNumeroCliente(cuerpo.numeroCliente);
    if (numeroCliente.error) return respuesta(400, { mensaje: numeroCliente.error });

    const creado = await clientesRepository.crear({
      ...cuerpo,
      ...(numeroCliente.valor ? { numeroCliente: numeroCliente.valor } : {}),
      activo: true,
    });
    return respuesta(201, {
      mensaje: 'Cliente creado correctamente',
      id: creado.id,
    });
  },

  async actualizar(idParametro, cuerpo) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();
    if (!esObjeto(cuerpo) || Object.keys(cuerpo).length === 0) {
      return respuesta(400, {
        mensaje: 'Se requiere un objeto JSON con campos para actualizar',
      });
    }

    const actual = await clientesRepository.buscarPorId(id);
    if (!actual) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    const actualizado = { ...actual, ...cuerpo, id };
    if (typeof actualizado.nombre !== 'string' || actualizado.nombre.trim().length === 0) {
      return respuesta(400, { mensaje: 'Se requieren los campos: nombre' });
    }
    const numeroCliente = validarNumeroCliente(actualizado.numeroCliente);
    if (numeroCliente.error) return respuesta(400, { mensaje: numeroCliente.error });
    if (numeroCliente.valor) actualizado.numeroCliente = numeroCliente.valor;
    else delete actualizado.numeroCliente;

    const guardado = await clientesRepository.actualizar(id, actualizado);
    if (!guardado) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    return respuesta(200, {
      mensaje: 'Cliente actualizado correctamente',
      id,
    });
  },

  async actualizarConexion(idParametro, cuerpo, usuarioAutenticado) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();
    if (usuarioAutenticado?.rolId !== 3) {
      return respuesta(403, { mensaje: 'Solo un técnico puede actualizar la conexión durante el servicio' });
    }
    if (!(await jornadaActivaDelTecnico(usuarioAutenticado))) return respuesta(403, JORNADA_INACTIVA);
    if (!esObjeto(cuerpo)) {
      return respuesta(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
    }
    const camposPermitidos = ['pelo', 'caja'];
    const camposRecibidos = Object.keys(cuerpo);
    if (!camposRecibidos.length || camposRecibidos.some((campo) => !camposPermitidos.includes(campo))) {
      return respuesta(400, { mensaje: 'Solo se pueden actualizar pelo y caja' });
    }

    const reclamosDelTecnico = await reclamosRepository.listar({
      tecnicoId: Number(usuarioAutenticado.id),
      clienteId: id,
    });
    if (!reclamosDelTecnico.length) {
      return respuesta(403, { mensaje: 'No tienes acceso a este cliente' });
    }

    const cambios = Object.fromEntries(camposRecibidos.map((campo) => {
      const valor = cuerpo[campo];
      if (valor == null || String(valor).trim() === '') return [campo, undefined];
      if (typeof valor !== 'string') return [campo, valor];
      return [campo, valor.trim()];
    }));
    if (Object.values(cambios).some((valor) => valor !== undefined && typeof valor !== 'string')) {
      return respuesta(400, { mensaje: 'Pelo y caja deben ser textos' });
    }

    const guardado = await clientesRepository.actualizar(id, cambios);
    if (!guardado) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    return respuesta(200, {
      mensaje: 'Datos de conexión actualizados correctamente',
      cliente: serializarCliente(guardado),
    });
  },

  async eliminar(idParametro) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();

    const eliminado = await clientesRepository.eliminar(id);
    if (!eliminado) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    return respuesta(200, {
      mensaje: 'Cliente eliminado correctamente',
      id,
    });
  },
};

function respuesta(status, body) {
  return { status, body };
}

function validarNumeroCliente(valor) {
  if (valor == null || String(valor).trim() === '') return { valor: '' };
  const normalizado = String(valor).trim().toUpperCase();
  return FORMATO_NUMERO_CLIENTE.test(normalizado)
    ? { valor: normalizado }
    : { error: 'El número de cliente solo puede contener letras, números, puntos, barras o guiones.' };
}

function errorId() {
  return respuesta(400, { mensaje: 'El ID debe ser un entero positivo' });
}

function convertirId(idParametro) {
  const id = Number(idParametro);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function serializarCliente(cliente) {
  const { passwordHash, contrasena, ...datosPublicos } = cliente;
  return datosPublicos;
}
