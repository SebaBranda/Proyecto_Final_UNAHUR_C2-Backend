import {
  AdminProfile,
  Contador,
  CoordinadorProfile,
  TecnicoProfile,
  Usuario,
} from '../models/schemas.js';
import { obtenerDefinicionPerfil } from '../config/perfiles.js';

const modelosPerfil = {
  1: AdminProfile,
  2: CoordinadorProfile,
  3: TecnicoProfile,
};

class UsuariosRepository {
  // Los listados no traen el hash de la contraseña (solo lo usan el login y la edición).
  async listar({ rolId, usuario } = {}) {
    const filtro = {};
    if (rolId) filtro.rolId = rolId;
    if (usuario) filtro.usuario = usuario;
    const registros = await Usuario.find(filtro).select('+nombre').lean();
    return this.combinarPerfiles(registros);
  }

  // Solo los usuarios indicados (por ejemplo, los técnicos de una página de reclamos).
  async listarPorIds(ids, { rolId } = {}) {
    if (!ids.length) return [];
    const filtro = { id: { $in: ids } };
    if (rolId) filtro.rolId = rolId;
    return this.combinarPerfiles(await Usuario.find(filtro).select('+nombre').lean());
  }

  // extra: condiciones adicionales de Mongo (búsqueda, estado...). orden: por defecto, por id.
  async listarPaginado({ rolId, usuario, extra = {} } = {}, { salto, limite }, orden = { id: 1 }) {
    const filtro = { ...extra };
    if (rolId) filtro.rolId = rolId;
    if (usuario) filtro.usuario = usuario;
    const [registros, total] = await Promise.all([
      Usuario.find(filtro)
        .collation({ locale: 'es', strength: 1 })
        .sort(orden)
        .skip(salto)
        .limit(limite)
        .select('+nombre')
        .lean(),
      Usuario.countDocuments(filtro),
    ]);
    return { datos: await this.combinarPerfiles(registros), total };
  }

  // Agrega su perfil a cada usuario con una consulta por rol (no una por usuario).
  async combinarPerfiles(registros) {
    const perfilesPorRol = await Promise.all(Object.entries(modelosPerfil).map(async ([rolId, ModeloPerfil]) => {
      const ids = registros.filter((registro) => registro.rolId === Number(rolId)).map((registro) => registro.id);
      const perfiles = ids.length
        ? await ModeloPerfil.find({ usuarioId: { $in: ids } }).select('-_id -__v').lean()
        : [];
      return perfiles;
    }));
    const perfilPorUsuario = new Map(perfilesPorRol.flat().map(({ usuarioId, ...perfil }) => [usuarioId, perfil]));
    return registros.map((registro) => ({ ...registro, perfil: perfilPorUsuario.get(registro.id) ?? {} }));
  }

  async contar(filtro = {}) {
    return Usuario.countDocuments(filtro);
  }

  // Ids de los usuarios cuyo perfil (DNI, correo...) coincide con la búsqueda.
  async idsPorPerfil(regex) {
    const condicion = { $or: [{ documento: regex }, { email: regex }, { telefono: regex }] };
    const perfiles = await Promise.all(
      [TecnicoProfile].map((Modelo) => Modelo.find(condicion).select('usuarioId -_id').lean()),
    );
    return perfiles.flat().map((perfil) => perfil.usuarioId);
  }

  // Ids de los usuarios cuyo nombre coincide con la búsqueda (por ejemplo, para buscar vehículos por técnico).
  async idsPorNombre(regex, { rolId } = {}) {
    const filtro = { nombre: regex };
    if (rolId) filtro.rolId = rolId;
    return (await Usuario.find(filtro).select('id -_id').lean()).map((usuario) => usuario.id);
  }

  async buscarPorId(id, { rolId } = {}) {
    const filtro = { id };
    if (rolId) filtro.rolId = rolId;
    const registro = await Usuario.findOne(filtro).select('+passwordHash +nombre').lean();
    return registro ? this.combinarPerfil(registro) : null;
  }

  // Sesión vigente y estado del usuario: lo consulta el middleware en cada pedido.
  async sesionVigente(id) {
    return Usuario.findOne({ id }).select('sesionId activo -_id').lean();
  }

  // Guarda la sesión nueva del usuario (login): reemplaza la anterior.
  async guardarSesion(id, sesionId) {
    await Usuario.updateOne({ id }, { $set: { sesionId } });
  }

  // Cierra la sesión solo si sigue siendo la indicada (un logout viejo no cierra una sesión nueva).
  async cerrarSesion(id, sesionId) {
    await Usuario.updateOne({ id, sesionId }, { $set: { sesionId: null } });
  }

  async buscarCredencialesPorUsuario(nombreUsuario) {
    const registro = await Usuario.findOne({ usuario: nombreUsuario })
      .select('+passwordHash +nombre')
      .lean();
    return registro ? this.combinarPerfil(registro) : null;
  }

  async existeNombreUsuario(nombreUsuario, excluirId) {
    const filtro = { usuario: nombreUsuario };
    if (excluirId !== undefined) filtro.id = { $ne: excluirId };
    return Boolean(await Usuario.exists(filtro));
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    const usuario = await Usuario.create({ ...seleccionarCamposBase(datos), id });
    const perfil = extraerPerfil(datos, usuario.rolId);
    if (perfil) await this.guardarPerfil(id, usuario.rolId, perfil);
    return this.combinarPerfil(usuario.toObject());
  }

  async actualizar(id, cambios, { rolId } = {}) {
    const filtro = { id };
    if (rolId) filtro.rolId = rolId;
    const actual = await Usuario.findOne(filtro).select('+passwordHash +nombre +sesionId').lean();
    if (!actual) return null;

    const actualizado = {
      ...actual,
      ...seleccionarCamposBase(cambios),
      id,
    };
    if (rolId) actualizado.rolId = rolId;
    // La sesión abierta sigue valiendo al editar el usuario. Si cambia el rol o la contraseña,
    // se cierra y tiene que volver a ingresar.
    if (actualizado.rolId !== actual.rolId || actualizado.passwordHash !== actual.passwordHash) {
      actualizado.sesionId = null;
    }
    const perfil = extraerPerfil(cambios, actualizado.rolId);

    await Usuario.replaceOne({ id }, actualizado);
    if (actual.rolId !== actualizado.rolId) {
      await this.eliminarPerfiles(id);
      if (perfil) await this.guardarPerfil(id, actualizado.rolId, perfil);
    } else if (perfil) {
      await this.guardarPerfil(id, actualizado.rolId, perfil);
    }
    return this.combinarPerfil(actualizado);
  }

  async eliminar(id, { rolId } = {}) {
    const filtro = { id };
    if (rolId) filtro.rolId = rolId;
    const eliminado = await Usuario.findOneAndDelete(filtro).select('+passwordHash +nombre').lean();
    if (!eliminado) return null;
    await this.eliminarPerfiles(id);
    return this.combinarPerfil(eliminado);
  }

  async combinarPerfil(usuario) {
    const ModeloPerfil = modelosPerfil[usuario.rolId];
    const perfil = ModeloPerfil
      ? await ModeloPerfil.findOne({ usuarioId: usuario.id }).select('-_id -__v').lean()
      : null;
    if (perfil) delete perfil.usuarioId;
    return { ...usuario, perfil: perfil ?? {} };
  }

  async guardarPerfil(usuarioId, rolId, datosPerfil) {
    const ModeloPerfil = modelosPerfil[rolId];
    if (!ModeloPerfil) return;
    await ModeloPerfil.findOneAndUpdate(
      { usuarioId },
      { ...datosPerfil, usuarioId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async eliminarPerfiles(usuarioId) {
    await Promise.all(Object.values(modelosPerfil).map((ModeloPerfil) => (
      ModeloPerfil.deleteOne({ usuarioId })
    )));
  }

  // El contador se suma en un solo paso dentro de la base ($inc): dos altas al mismo tiempo
  // nunca reciben el mismo id.
  async siguienteId() {
    const contador = await Contador.findOneAndUpdate(
      { _id: 'usuarios' },
      { $inc: { valor: 1 } },
      { new: true, upsert: true },
    ).lean();
    return contador.valor;
  }
}

function seleccionarCamposBase(datos) {
  return Object.fromEntries(
    ['usuario', 'passwordHash', 'nombre', 'rolId', 'activo']
      .filter((campo) => Object.hasOwn(datos, campo))
      .map((campo) => [campo, datos[campo]]),
  );
}

function extraerPerfil(datos, rolId) {
  const definicionPerfil = obtenerDefinicionPerfil(rolId);
  const perfilAnidado = datos.perfil && typeof datos.perfil === 'object' && !Array.isArray(datos.perfil)
    ? datos.perfil
    : {};
  if (!definicionPerfil) return null;
  const perfil = Object.fromEntries(
    Object.keys(definicionPerfil)
      .filter((campo) => Object.hasOwn(perfilAnidado, campo))
      .map((campo) => [campo, perfilAnidado[campo]]),
  );
  return Object.keys(perfil).length > 0 ? perfil : null;
}

export const usuariosRepository = new UsuariosRepository();
