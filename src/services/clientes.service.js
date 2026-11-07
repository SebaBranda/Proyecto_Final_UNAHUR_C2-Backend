import { clientesRepository } from '../repositories/clientes.repository.js';
import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { JORNADA_INACTIVA, jornadaActivaDelTecnico } from '../utils/jornadaActiva.js';
import {
  obtenerPaginacion, regexDeBusqueda, respuestaPaginada, textoDeBusqueda,
} from '../utils/paginacion.js';

const CAMPOS_BUSQUEDA = ['nombre', 'numeroCliente', 'pelo', 'caja', 'documento', 'telefono', 'email', 'direccion', 'ubicacion'];
const FORMATO_NUMERO_CLIENTE = /^[A-Za-z0-9]+(?:[./-][A-Za-z0-9]+)*$/;
const FILTRO_POR_ESTADO = { Todos: {}, Activos: { activo: { $ne: false } }, Inactivos: { activo: false } };
// Lo único que se guarda de un cliente (el id lo pone el backend).
const CAMPOS_TEXTO = ['nombre', 'numeroCliente', 'pelo', 'caja', 'documento', 'telefono', 'email', 'direccion', 'ubicacion', 'zona'];
const LARGO_MAXIMO = 200;
const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const formatoTelefono = /^[0-9+()\-\s]{6,20}$/;

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
    const datos = camposDelCliente(cuerpo);
    const error = validarCliente(datos);
    if (error) return respuesta(400, { mensaje: error });
    const numeroCliente = validarNumeroCliente(datos.numeroCliente);
    if (numeroCliente.error) return respuesta(400, { mensaje: numeroCliente.error });
    if (numeroCliente.valor) datos.numeroCliente = numeroCliente.valor;
    else delete datos.numeroCliente;

    const creado = await clientesRepository.crear({ ...datos, activo: true });
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
    const cambios = camposDelCliente(cuerpo);
    if (!Object.keys(cambios).length) return respuesta(400, { mensaje: 'No hay campos modificables' });
    const actualizado = { ...actual, ...cambios, id };
    if (typeof actualizado.nombre !== 'string' || actualizado.nombre.trim().length === 0) {
      return respuesta(400, { mensaje: 'Se requieren los campos: nombre' });
    }
    const error = validarCliente(cambios);
    if (error) return respuesta(400, { mensaje: error });
    if (Object.hasOwn(cambios, 'numeroCliente')) {
      const numeroCliente = validarNumeroCliente(cambios.numeroCliente);
      if (numeroCliente.error) return respuesta(400, { mensaje: numeroCliente.error });
      cambios.numeroCliente = numeroCliente.valor;
    }

    const guardado = await clientesRepository.actualizar(id, cambios);
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

  // Baja lógica: el cliente queda deshabilitado (no se borra), así sus reclamos y los reportes
  // lo conservan. Se puede volver a habilitar editándolo (activo: true).
  async eliminar(idParametro) {
    const id = convertirId(idParametro);
    if (id === null) return errorId();

    const deshabilitado = await clientesRepository.actualizar(id, { activo: false });
    if (!deshabilitado) return respuesta(404, { mensaje: 'Cliente no encontrado' });
    return respuesta(200, {
      mensaje: 'Cliente dado de baja correctamente',
      id,
    });
  },
};

// Solo los datos conocidos del cliente: nombre, número de cliente, pelo y caja de la conexión,
// documento, contacto, domicilio, ubicación, zona, coordenadas del domicilio y si está activo.
function camposDelCliente(cuerpo) {
  const datos = Object.fromEntries(
    [...CAMPOS_TEXTO, 'coordenadas', 'activo']
      .filter((campo) => Object.hasOwn(cuerpo, campo))
      .map((campo) => [campo, cuerpo[campo]]),
  );
  CAMPOS_TEXTO.forEach((campo) => {
    if (typeof datos[campo] === 'string') datos[campo] = datos[campo].trim();
  });
  return datos;
}

// Devuelve el mensaje de error para mostrar, o null si los datos son válidos.
function validarCliente(datos) {
  for (const campo of CAMPOS_TEXTO) {
    if (datos[campo] == null || datos[campo] === '') continue;
    if (typeof datos[campo] !== 'string') return `El campo ${campo} debe ser texto`;
    if (datos[campo].length > LARGO_MAXIMO) return `El campo ${campo} admite hasta ${LARGO_MAXIMO} caracteres`;
  }
  if (datos.email && !formatoEmail.test(datos.email)) return 'El correo no es válido';
  if (datos.telefono && !formatoTelefono.test(datos.telefono)) return 'El teléfono no es válido (solo números, espacios, guiones, + y paréntesis)';
  if (datos.activo !== undefined && typeof datos.activo !== 'boolean') return 'El campo activo debe ser true o false';
  if (datos.coordenadas != null) {
    const { latitud, longitud } = datos.coordenadas;
    if (!esObjeto(datos.coordenadas) || typeof latitud !== 'number' || typeof longitud !== 'number'
      || latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      return 'Las coordenadas deben tener latitud y longitud válidas';
    }
  }
  return null;
}

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
