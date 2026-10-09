import { clientesRepository } from '../repositories/clientes.repository.js';

export const clientesService = {
  async listar() {
    const clientes = await clientesRepository.listar();
    return respuesta(200, clientes.map(serializarCliente));
  },

  async obtener(idParametro) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();

    const cliente = await clientesRepository.buscarPorId(id);
    if (!cliente) return respuesta(404, { mensaje: 'Cliente no encontrado' });
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
