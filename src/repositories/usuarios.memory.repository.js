export class UsuariosMemoryRepository {
  constructor(usuariosIniciales) {
    this.usuarios = usuariosIniciales.map((usuario) => ({ ...usuario }));
    this.siguienteId = Math.max(0, ...this.usuarios.map((usuario) => usuario.id)) + 1;
  }

  async listar({ rol, usuario } = {}) {
    return this.usuarios
      .filter((registro) => (!rol || registro.rol === rol) && (!usuario || registro.usuario === usuario))
      .map((registro) => ({ ...registro }));
  }

  async buscarPorId(id, { rol } = {}) {
    const usuario = this.usuarios.find((registro) => (
      registro.id === id && (!rol || registro.rol === rol)
    ));
    return usuario ? { ...usuario } : null;
  }

  async existeNombreUsuario(nombreUsuario, excluirId) {
    return this.usuarios.some((usuario) => (
      usuario.usuario === nombreUsuario && usuario.id !== excluirId
    ));
  }

  async crear(datos, { rol } = {}) {
    if (this.usuarios.some((usuario) => usuario.usuario === datos.usuario)) {
      throw crearErrorNombreDuplicado();
    }

    const usuario = {
      ...datos,
      ...(rol ? { rol } : {}),
      id: this.siguienteId++,
    };
    this.usuarios.push(usuario);
    return { ...usuario };
  }

  async actualizar(id, cambios, { rol } = {}) {
    const indice = this.usuarios.findIndex((usuario) => (
      usuario.id === id && (!rol || usuario.rol === rol)
    ));
    if (indice === -1) return null;

    if (this.usuarios.some((usuario) => usuario.usuario === cambios.usuario && usuario.id !== id)) {
      throw crearErrorNombreDuplicado();
    }

    const actualizado = {
      ...this.usuarios[indice],
      ...cambios,
      ...(rol ? { rol } : {}),
      id,
    };
    this.usuarios[indice] = actualizado;
    return { ...actualizado };
  }

  async eliminar(id, { rol } = {}) {
    const indice = this.usuarios.findIndex((usuario) => (
      usuario.id === id && (!rol || usuario.rol === rol)
    ));
    if (indice === -1) return null;
    const [eliminado] = this.usuarios.splice(indice, 1);
    return { ...eliminado };
  }
}

function crearErrorNombreDuplicado() {
  const error = new Error('El nombre de usuario ya existe');
  error.code = 'DUPLICATE_USERNAME';
  return error;
}