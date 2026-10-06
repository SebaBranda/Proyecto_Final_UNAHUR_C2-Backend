import { hashPassword } from './password.service.js';

export function serializarUsuario(usuario) {
  const { contrasena, passwordHash, ...datosPublicos } = usuario;
  return datosPublicos;
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
