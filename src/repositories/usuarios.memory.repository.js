import { obtenerDefinicionPerfil } from '../config/perfiles.js';

export class UsuariosMemoryRepository {
  constructor(
    usuariosIniciales,
    {
      adminPerfilesIniciales = [],
      coordinadorPerfilesIniciales = [],
      tecnicoPerfilesIniciales = [],
    } = {},
  ) {
    this.usuarios = usuariosIniciales.map((usuario) => ({ ...usuario }));
    this.adminPerfiles = adminPerfilesIniciales.map((perfil) => ({ ...perfil }));
    this.coordinadorPerfiles = coordinadorPerfilesIniciales.map((perfil) => ({ ...perfil }));
    this.tecnicoPerfiles = tecnicoPerfilesIniciales.map((perfil) => ({ ...perfil }));
    this.siguienteId = Math.max(0, ...this.usuarios.map((usuario) => usuario.id)) + 1;
  }

  async listar({ rolId, usuario } = {}) {
    return this.usuarios
      .filter((registro) => (!rolId || registro.rolId === rolId) && (!usuario || registro.usuario === usuario))
      .map((registro) => this.combinarPerfil(registro));
  }

  async buscarPorId(id, { rolId } = {}) {
    const usuario = this.usuarios.find((registro) => (
      registro.id === id && (!rolId || registro.rolId === rolId)
    ));
    return usuario ? this.combinarPerfil(usuario) : null;
  }

  async buscarCredencialesPorUsuario(nombreUsuario) {
    const usuario = this.usuarios.find((registro) => registro.usuario === nombreUsuario);
    return usuario ? { ...usuario } : null;
  }

  async existeNombreUsuario(nombreUsuario, excluirId) {
    return this.usuarios.some((usuario) => (
      usuario.usuario === nombreUsuario && usuario.id !== excluirId
    ));
  }

  async crear(datos, { rolId } = {}) {
    if (this.usuarios.some((usuario) => usuario.usuario === datos.usuario)) {
      throw crearErrorNombreDuplicado();
    }

    const usuario = {
      ...seleccionarCamposBase(datos),
      ...(rolId ? { rolId } : {}),
      id: this.siguienteId++,
    };
    const perfil = extraerPerfil(datos, usuario.rolId);
    this.usuarios.push(usuario);
    this.guardarPerfil(usuario.id, usuario.rolId, perfil);
    return this.combinarPerfil(usuario);
  }

  async actualizar(id, cambios, { rolId } = {}) {
    const indice = this.usuarios.findIndex((usuario) => (
      usuario.id === id && (!rolId || usuario.rolId === rolId)
    ));
    if (indice === -1) return null;

    if (cambios.usuario !== undefined
      && this.usuarios.some((usuario) => usuario.usuario === cambios.usuario && usuario.id !== id)) {
      throw crearErrorNombreDuplicado();
    }

    const actual = this.usuarios[indice];
    const actualizado = {
      ...actual,
      ...seleccionarCamposBase(cambios),
      ...(rolId ? { rolId } : {}),
      id,
    };
    const perfilActual = this.obtenerPerfil(id, actual.rolId);
    const perfilCambios = extraerPerfil(cambios, actualizado.rolId);

    if (actual.rolId !== actualizado.rolId) {
      this.eliminarPerfiles(id);
      this.guardarPerfil(id, actualizado.rolId, perfilCambios);
    } else if (perfilCambios) {
      this.guardarPerfil(id, actualizado.rolId, {
        ...perfilActual,
        ...perfilCambios,
      });
    }

    this.usuarios[indice] = actualizado;
    return this.combinarPerfil(actualizado);
  }

  async eliminar(id, { rolId } = {}) {
    const indice = this.usuarios.findIndex((usuario) => (
      usuario.id === id && (!rolId || usuario.rolId === rolId)
    ));
    if (indice === -1) return null;
    const [eliminado] = this.usuarios.splice(indice, 1);
    this.eliminarPerfiles(id);
    return this.combinarPerfil(eliminado);
  }

  combinarPerfil(usuario) {
    return {
      ...usuario,
      perfil: { ...this.obtenerPerfil(usuario.id, usuario.rolId) },
    };
  }

  obtenerPerfil(usuarioId, rolId) {
    const perfiles = this.perfilesPorRol(rolId);
    return perfiles?.find((perfil) => perfil.usuarioId === usuarioId) ?? {};
  }

  guardarPerfil(usuarioId, rolId, datosPerfil = {}) {
    const perfiles = this.perfilesPorRol(rolId);
    if (!perfiles) return;

    const indice = perfiles.findIndex((perfil) => perfil.usuarioId === usuarioId);
    const perfil = { ...(indice === -1 ? {} : perfiles[indice]), ...datosPerfil, usuarioId };
    if (indice === -1) perfiles.push(perfil);
    else perfiles[indice] = perfil;
  }

  eliminarPerfiles(usuarioId) {
    this.adminPerfiles = this.adminPerfiles.filter((perfil) => perfil.usuarioId !== usuarioId);
    this.coordinadorPerfiles = this.coordinadorPerfiles.filter((perfil) => perfil.usuarioId !== usuarioId);
    this.tecnicoPerfiles = this.tecnicoPerfiles.filter((perfil) => perfil.usuarioId !== usuarioId);
  }

  perfilesPorRol(rolId) {
    if (rolId === 1) return this.adminPerfiles;
    if (rolId === 2) return this.coordinadorPerfiles;
    if (rolId === 3) return this.tecnicoPerfiles;
    return null;
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
  if (!definicionPerfil) return null;
  const perfilAnidado = datos.perfil && typeof datos.perfil === 'object' && !Array.isArray(datos.perfil)
    ? datos.perfil
    : {};
  const perfil = Object.fromEntries(
    Object.keys(definicionPerfil)
      .filter((campo) => Object.hasOwn(perfilAnidado, campo))
      .map((campo) => [campo, perfilAnidado[campo]]),
  );
  return Object.keys(perfil).length > 0 ? perfil : null;
}

function crearErrorNombreDuplicado() {
  const error = new Error('El nombre de usuario ya existe');
  error.code = 'DUPLICATE_USERNAME';
  return error;
}
