import { hashPassword } from './password.service.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { buscarRol } from '../config/roles.js';

const configuracionComun = {
  repository: usuariosRepository,
  preparar: prepararUsuarioParaGuardar,
  serializar: serializarUsuario,
  validar: validarUsuario,
};

export const usuariosService = crearServicioUsuarios({
  ...configuracionComun,
  camposRequeridos: ['usuario', 'nombre'],
  valoresPorDefecto: { activo: true },
  nombre: 'Usuario',
});

export const tecnicosService = crearServicioUsuarios({
  ...configuracionComun,
  camposRequeridos: ['usuario', 'nombre'],
  rolId: 3,
  valoresPorDefecto: { rolId: 3, activo: true },
  normalizar: (tecnico) => ({ ...tecnico, rolId: 3 }),
  nombre: 'Técnico',
});

export function serializarUsuario(usuario) {
  const { contrasena, passwordHash, ...datosPublicos } = usuario;
  return datosPublicos;
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

function crearServicioUsuarios({
  repository,
  camposRequeridos,
  valoresPorDefecto,
  rolId,
  normalizar = (registro) => registro,
  preparar,
  serializar,
  validar,
  nombre,
}) {
  return {
    async listar({ usuario } = {}) {
      const registros = await repository.listar({ rolId, usuario });
      return respuesta(200, registros.map(serializar));
    },

    async obtener(idParametro) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();

      const registro = await repository.buscarPorId(id, { rolId });
      if (!registro) return respuesta(404, { mensaje: `${nombre} no encontrado` });
      return respuesta(200, serializar(registro));
    },

    async crear(cuerpo) {
      if (!esObjeto(cuerpo)) {
        return respuesta(400, { mensaje: 'El cuerpo debe ser un objeto JSON' });
      }

      const registro = normalizar({ ...valoresPorDefecto, ...cuerpo });
      const error = validarCampos(registro, camposRequeridos)
        || await validar(registro, null, repository);
      if (error) return respuesta(400, { mensaje: error });

      const preparado = await preparar(registro, null, cuerpo);
      const creado = await repository.crear(preparado, { rolId });
      return respuesta(201, `${nombre} creado correctamente`);
    },

    async actualizar(idParametro, cuerpo) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();
      if (!esObjeto(cuerpo) || Object.keys(cuerpo).length === 0) {
        return respuesta(400, {
          mensaje: 'Se requiere un objeto JSON con campos para actualizar',
        });
      }

      const actual = await repository.buscarPorId(id, { rolId });
      if (!actual) return respuesta(404, { mensaje: `${nombre} no encontrado` });

      const actualizado = normalizar({ ...actual, ...cuerpo, id });
      const error = validarCampos(actualizado, camposRequeridos)
        || await validar(actualizado, actual, repository);
      if (error) return respuesta(400, { mensaje: error });

      const preparado = await preparar(actualizado, actual, cuerpo);
      const guardado = await repository.actualizar(id, preparado, { rolId });
      if (!guardado) return respuesta(404, { mensaje: `${nombre} no encontrado` });
      return respuesta(200, `${nombre} actualizado correctamente`);
    },

    async eliminar(idParametro) {
      const id = convertirId(idParametro);
      if (id === null) return errorId();

      const eliminado = await repository.eliminar(id, { rolId });
      if (!eliminado) return respuesta(404, { mensaje: `${nombre} no encontrado` });
      return respuesta(200, `${nombre} eliminado correctamente`);
    },
  };
}

function validarCampos(registro, camposRequeridos) {
  const faltantes = camposRequeridos.filter((campo) => (
    typeof registro[campo] !== 'string' || registro[campo].trim().length === 0
  ));
  return faltantes.length ? `Se requieren los campos: ${faltantes.join(', ')}` : null;
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
