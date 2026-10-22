import jwt from 'jsonwebtoken';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { jornadasRepository } from '../repositories/jornadas.repository.js';
import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { verifyPassword } from './password.service.js';
import { buscarRol } from '../config/roles.js';
import { serializarUsuario } from './usuarios.service.js';

const TOKEN_LIFETIME_SECONDS = 60 * 60;
const TOKEN_ISSUER = 'galacticapp-api';

export async function iniciarSesion({ usuario, contrasena } = {}) {
  if (!credencialesValidas(usuario, contrasena)) {
    return respuesta(400, { mensaje: 'Se requieren usuario y contraseña' });
  }

  const registro = await usuariosRepository.buscarCredencialesPorUsuario(usuario.trim());
  if (!registro || !registro.activo
    || !await verifyPassword(contrasena, registro.passwordHash)) {
    return respuesta(401, { mensaje: 'Usuario o contraseña incorrectos' });
  }
  const rol = buscarRol(registro.rolId);
  if (!rol) {
    return respuesta(403, { mensaje: 'El usuario no tiene un rol válido' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 bytes');
  }

  const token = jwt.sign(
    { rolId: rol.id },
    secret,
    {
      algorithm: 'HS256',
      subject: String(registro.id),
      issuer: TOKEN_ISSUER,
      expiresIn: TOKEN_LIFETIME_SECONDS,
    },
  );

  return respuesta(200, {
    mensaje: 'Inicio de sesión correcto',
    usuario: serializarUsuario(registro),
    token,
    tokenType: 'Bearer',
    expiresIn: TOKEN_LIFETIME_SECONDS,
    ...(rol.id === 3 ? await datosDelTecnico(registro.id) : {}),
  });
}

// El técnico necesita en todas sus pantallas su jornada activa (indicador del menú) y su
// vehículo (aviso semanal de kilometraje): vienen en el login para no pedirlos en cada pantalla.
async function datosDelTecnico(tecnicoId) {
  const [jornadas, vehiculos] = await Promise.all([
    jornadasRepository.listar({ tecnicoId, activa: true }),
    vehiculosRepository.listar({ tecnicoAsignado: tecnicoId }),
  ]);
  const { controles, ...vehiculo } = vehiculos[0] || {};
  return {
    jornadaActiva: jornadas[0] || null,
    vehiculo: vehiculos[0] ? vehiculo : null,
  };
}

function credencialesValidas(usuario, contrasena) {
  return typeof usuario === 'string'
    && usuario.trim().length > 0
    && typeof contrasena === 'string'
    && contrasena.length > 0;
}

function respuesta(status, body) {
  return { status, body };
}
