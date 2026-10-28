import { clientesRepository } from '../repositories/clientes.repository.js';
import { reclamosRepository } from '../repositories/reclamos.repository.js';
import {
  obtenerPaginacion, regexDeBusqueda, respuestaPaginada, textoDeBusqueda,
} from '../utils/paginacion.js';

const CAMPOS_BUSQUEDA = ['nombre', 'documento', 'telefono', 'email', 'direccion'];
const FILTRO_POR_ESTADO = { Todos: {}, Activos: { activo: { $ne: false } }, Inactivos: { activo: false } };

export const clientesService = {
  // Filtros opcionales: buscar (nombre, DNI, teléfono, correo o domicilio) y estado (Todos, Activos, Inactivos).
  async listar(usuarioAutenticado, query = {}) {
    const paginacion = obtenerPaginacion(query);
    const estado = query.estado || 'Todos';
    if (!FILTRO_POR_ESTADO[estado]) return respuesta(400, { mensaje: 'El estado debe ser Todos, Activos o Inactivos' });
    const filtro = { ...FILTRO_POR_ESTADO[estado] };
    if (usuarioAutenticado?.rolId === 3) {
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

    const creado = await clientesRepository.crear({ ...cuerpo, activo: true });
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

    const guardado = await clientesRepository.actualizar(id, actualizado);
    if (!guardado) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    return respuesta(200, {
      mensaje: 'Cliente actualizado correctamente',
      id,
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
