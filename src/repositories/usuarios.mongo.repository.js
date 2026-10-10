import {
  AdminProfile,
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

export class UsuariosMongoRepository {
  async listar({ rolId, usuario } = {}) {
    const filtro = {};
    if (rolId) filtro.rolId = rolId;
    if (usuario) filtro.usuario = usuario;
    const registros = await Usuario.find(filtro).select('+passwordHash +nombre').lean();
    return Promise.all(registros.map((registro) => this.combinarPerfil(registro)));
  }

  async buscarPorId(id, { rolId } = {}) {
    const filtro = { id };
    if (rolId) filtro.rolId = rolId;
    const registro = await Usuario.findOne(filtro).select('+passwordHash +nombre').lean();
    return registro ? this.combinarPerfil(registro) : null;
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
    const actual = await Usuario.findOne(filtro).select('+passwordHash +nombre').lean();
    if (!actual) return null;

    const actualizado = {
      ...actual,
      ...seleccionarCamposBase(cambios),
      id,
    };
    if (rolId) actualizado.rolId = rolId;
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

  async siguienteId() {
    const ultimo = await Usuario.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
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
