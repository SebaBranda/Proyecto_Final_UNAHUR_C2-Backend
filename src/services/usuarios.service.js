import { buscarRol } from '../config/roles.js';
import {
  obtenerDefinicionPerfil,
  TODOS_LOS_CAMPOS_PERFIL,
} from '../config/perfiles.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { hashPassword } from './password.service.js';

export const usuariosService = crearServicioUsuarios();

export const tecnicosService = {
  listar({ usuario } = {}) {
    return usuariosService.listar({ usuario, rolId: 3 });
  },
  obtener(id) {
    return usuariosService.obtener(id, { rolId: 3 });
  },
};

export function serializarUsuario(usuario) {
  const mostrarContrasena = false; 
  if (mostrarContrasena) {
    const { contrasena, perfil = {}, ...datosPublicos } = usuario;
    const rol = buscarRol(datosPublicos.rolId);
    return {
      id: datosPublicos.id,
      usuario: datosPublicos.usuario,
      nombre: datosPublicos.nombre,
      rolId: datosPublicos.rolId,
      rol: rol?.nombre,
      activo: datosPublicos.activo,
      perfil: { ...perfil },
      passwordHash: datosPublicos.passwordHash,
    };
  } else {
    const { contrasena, passwordHash, perfil = {}, ...datosPublicos } = usuario;
    const rol = buscarRol(datosPublicos.rolId);
    return {
      id: datosPublicos.id,
      usuario: datosPublicos.usuario,
      nombre: datosPublicos.nombre,
      rolId: datosPublicos.rolId,
      rol: rol?.nombre,
      activo: datosPublicos.activo,
      perfil: { ...perfil },
    };
  }
}

export async function validarUsuario(registro, actual, repository) {
  if (!actual && (typeof registro.contrasena !== 'string' || !registro.contrasena)) {
    return 'Se requiere una contraseña';
  }
  if (Object.hasOwn(registro, 'contrasena')
    && (typeof registro.contrasena !== 'string' || !registro.contrasena)) {
    return 'La contraseña no puede estar vacía';
  }
  if (!Number.isInteger(registro.rolId) || !buscarRol(registro.rolId)) {
    return 'El rolId debe ser 1 (Administrador), 2 (Coordinador) o 3 (Tecnico)';
  }
  if (Object.hasOwn(registro, 'activo') && typeof registro.activo !== 'boolean') {
    return 'El campo activo debe ser booleano';
  }
  if (await repository.existeNombreUsuario(registro.usuario, actual?.id)) {
    return 'El nombre de usuario ya existe';
  }
  return null;
}

export async function prepararUsuarioParaGuardar(usuario, actual, cambios = {}) {
  const registro = { ...usuario };
  if (Object.hasOwn(cambios, 'contrasena') || !actual) {
    registro.passwordHash = await hashPassword(registro.contrasena);
  } else {
    registro.passwordHash = actual.passwordHash;
  }
  delete registro.contrasena;
  return registro;
}

function crearServicioUsuarios() {
  return {
    async listar({ usuario, rolId } = {}) {
      const registros = await usuariosRepository.listar({ usuario, rolId });
      return respuesta(200, registros.map(serializarUsuario));
    },

    async obtener(idParametro, { rolId } = {}) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();

      const registro = await usuariosRepository.buscarPorId(id, { rolId });
      if (!registro) return respuesta(404, { mensaje: 'Usuario no encontrado' });
      return respuesta(200, serializarUsuario(registro));
    },

    async crear(cuerpo, { rolId: rolForzado } = {}) {
      if (!esObjeto(cuerpo)) {
        return respuesta(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
      }

      const entrada = normalizarEntrada(cuerpo, null, rolForzado);
      if (entrada.error) return respuesta(400, { mensaje: entrada.error });
      const registro = { activo: true, ...entrada.datos };
      const error = validarCampos(registro, ['usuario', 'nombre'])
        || validarPerfil(registro.perfil, registro.rolId)
        || await validarUsuario(registro, null, usuariosRepository);
      if (error) return respuesta(400, { mensaje: error });

      const preparado = await prepararUsuarioParaGuardar(registro, null, cuerpo);
      const creado = await usuariosRepository.crear(preparado);
      return respuesta(201, {
        mensaje: 'Usuario creado correctamente',
        id: creado.id,
      });
    },

    async actualizar(idParametro, cuerpo, { rolId: rolForzado } = {}) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();
      if (!esObjeto(cuerpo) || Object.keys(cuerpo).length === 0) {
        return respuesta(400, {
          mensaje: 'Se requiere un objeto JSON con campos para actualizar',
        });
      }

      const actual = await usuariosRepository.buscarPorId(id, { rolId: rolForzado });
      if (!actual) return respuesta(404, { mensaje: 'Usuario no encontrado' });

      const entrada = normalizarEntrada(cuerpo, actual, rolForzado);
      if (entrada.error) return respuesta(400, { mensaje: entrada.error });
      const registro = { ...actual, ...entrada.datos, id };
      if (entrada.datos.perfil) {
        registro.perfil = actual.rolId === registro.rolId
          ? { ...actual.perfil, ...entrada.datos.perfil }
          : { ...entrada.datos.perfil };
      }
      if (actual.rolId !== registro.rolId && !entrada.datos.perfil) {
        registro.perfil = {};
      }
      const error = validarCampos(registro, ['usuario', 'nombre'])
        || validarPerfil(registro.perfil, registro.rolId)
        || await validarUsuario(registro, actual, usuariosRepository);
      if (error) return respuesta(400, { mensaje: error });

      const preparado = await prepararUsuarioParaGuardar(registro, actual, cuerpo);
      if (rolForzado) preparado.rolId = rolForzado;
      const guardado = await usuariosRepository.actualizar(id, preparado, {
        ...(rolForzado ? { rolId: rolForzado } : {}),
      });
      if (!guardado) return respuesta(404, { mensaje: 'Usuario no encontrado' });
      return respuesta(200, {
        mensaje: 'Usuario actualizado correctamente',
        id,
      });
    },

    async eliminar(idParametro, { rolId } = {}) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();

      const eliminado = await usuariosRepository.eliminar(id, { rolId });
      if (!eliminado) return respuesta(404, { mensaje: 'Usuario no encontrado' });
      return respuesta(200, {
        mensaje: 'Usuario eliminado correctamente',
        id,
      });
    },
  };
}

function normalizarEntrada(cuerpo, actual, rolForzado) {
  const datos = { ...cuerpo };
  const valorRol = rolForzado ?? datos.rolId ?? datos.rol ?? actual?.rolId;
  const rol = buscarRol(valorRol);
  if (!rol) {
    return { error: 'El rolId debe ser 1 (Administrador), 2 (Coordinador) o 3 (Tecnico)' };
  }

  datos.rolId = rol.id;
  delete datos.rol;

  const campoPerfilPlano = TODOS_LOS_CAMPOS_PERFIL.find((campo) => Object.hasOwn(datos, campo));
  if (campoPerfilPlano) {
    return { error: 'Los campos de perfil deben enviarse dentro del objeto perfil' };
  }

  const perfil = Object.hasOwn(datos, 'perfil') ? datos.perfil : undefined;
  if (perfil !== undefined && !esObjeto(perfil)) {
    return { error: 'El perfil debe ser un objeto JSON' };
  }

  const definicionPerfil = obtenerDefinicionPerfil(rol.id);
  const campoAnidadoInvalido = Object.keys(perfil ?? {}).find((campo) => (
    !Object.hasOwn(definicionPerfil, campo)
  ));
  if (campoAnidadoInvalido) {
    return { error: `${campoAnidadoInvalido} no pertenece al perfil del rol seleccionado` };
  }
  TODOS_LOS_CAMPOS_PERFIL.forEach((campo) => delete datos[campo]);
  delete datos.perfil;

  if (perfil !== undefined || !actual) {
    datos.perfil = { ...(perfil ?? {}) };
  }
  return { datos };
}

function validarCampos(registro, camposRequeridos) {
  const faltantes = camposRequeridos.filter((campo) => (
    typeof registro[campo] !== 'string' || registro[campo].trim().length === 0
  ));
  return faltantes.length ? `Se requieren los campos: ${faltantes.join(', ')}` : null;
}

function validarPerfil(perfil, rolId) {
  if (!esObjeto(perfil)) return 'El perfil debe ser un objeto JSON';

  const definicionPerfil = obtenerDefinicionPerfil(rolId);
  if (!definicionPerfil) return 'El rol del perfil no es válido';

  for (const [campo, definicion] of Object.entries(definicionPerfil)) {
    if (!Object.hasOwn(perfil, campo) || perfil[campo] === '' || perfil[campo] === null) continue;
    if (definicion.tipo === 'number') {
      if (typeof perfil[campo] !== 'number' || !Number.isFinite(perfil[campo])
        || (definicion.minimo !== undefined && perfil[campo] < definicion.minimo)) {
        return `${campo} debe ser un número válido${definicion.minimo !== undefined ? ` mayor o igual a ${definicion.minimo}` : ''}`;
      }
    } else if (definicion.tipo === 'date') {
      if (Number.isNaN(new Date(perfil[campo]).getTime())) {
        return `${campo} debe ser una fecha válida`;
      }
    } else if (definicion.tipo === 'string' && typeof perfil[campo] !== 'string') {
      return `${campo} debe ser texto`;
    }
  }
  return null;
}

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
