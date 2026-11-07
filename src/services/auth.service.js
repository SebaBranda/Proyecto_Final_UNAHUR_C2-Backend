import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { jornadasRepository } from '../repositories/jornadas.repository.js';
import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { verifyPassword } from './password.service.js';
import { buscarRol } from '../config/roles.js';
import { serializarUsuario } from './usuarios.service.js';

const TOKEN_LIFETIME_SECONDS = 60 * 60;
const TOKEN_ISSUER = 'galacticapp-api';

// Límite de intentos: después de 5 contraseñas incorrectas seguidas para un mismo usuario, ese
// usuario no puede ingresar durante 5 minutos (frena a quien prueba contraseñas al azar).
// Se guarda en memoria: si el servidor se reinicia, los contadores vuelven a cero.
const MAXIMO_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
const intentosFallidos = new Map(); // usuario -> { cantidad, bloqueadoHasta, ultimo }

function minutosDeBloqueo(clave) {
  const registro = intentosFallidos.get(clave);
  const restante = (registro?.bloqueadoHasta || 0) - Date.now();
  return restante > 0 ? Math.ceil(restante / 60000) : 0;
}

function anotarIntentoFallido(clave) {
  const ahora = Date.now();
  // Se olvidan los registros viejos para que el mapa no crezca sin límite.
  if (intentosFallidos.size > 1000) {
    for (const [otra, registro] of intentosFallidos) {
      if (ahora - registro.ultimo > BLOQUEO_MS) intentosFallidos.delete(otra);
    }
  }
  const registro = intentosFallidos.get(clave);
  const cantidad = (registro && ahora - registro.ultimo <= BLOQUEO_MS ? registro.cantidad : 0) + 1;
  intentosFallidos.set(clave, {
    cantidad: cantidad >= MAXIMO_INTENTOS ? 0 : cantidad,
    bloqueadoHasta: cantidad >= MAXIMO_INTENTOS ? ahora + BLOQUEO_MS : 0,
    ultimo: ahora,
  });
}

// plataforma: 'mobile' cuando ingresa la app del técnico. El rol se valida antes de abrir la
// sesión, para que un administrador que prueba la app no cierre su sesión de la web.
export async function iniciarSesion({ usuario, contrasena, plataforma } = {}) {
  if (!credencialesValidas(usuario, contrasena)) {
    return respuesta(400, { mensaje: 'Se requieren usuario y contraseña' });
  }

  const clave = usuario.trim().toLowerCase();
  const minutos = minutosDeBloqueo(clave);
  if (minutos) {
    return respuesta(429, {
      mensaje: `Demasiados intentos fallidos. Probá de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
    });
  }

  const registro = await usuariosRepository.buscarCredencialesPorUsuario(usuario.trim());
  if (!registro || !registro.activo
    || !await verifyPassword(contrasena, registro.passwordHash)) {
    anotarIntentoFallido(clave);
    return respuesta(401, { mensaje: 'Usuario o contraseña incorrectos' });
  }
  intentosFallidos.delete(clave);
  const rol = buscarRol(registro.rolId);
  if (!rol) {
    return respuesta(403, { mensaje: 'El usuario no tiene un rol válido' });
  }
  if (plataforma === 'mobile' && rol.id !== 3) {
    return respuesta(403, { mensaje: 'La app móvil es solo para técnicos. Administradores y coordinadores ingresan desde la web.' });
  }
  // Cada login abre una sesión nueva y cierra la anterior (si había otra abierta).
  const sesionId = randomUUID();
  await usuariosRepository.guardarSesion(registro.id, sesionId);
  return respuesta(200, await armarSesion(registro, rol, 'Inicio de sesión correcto', sesionId));
}

// Cierra la sesión actual: sus tokens dejan de servir en todos lados (web y mobile).
export async function cerrarSesion(usuarioAutenticado) {
  await usuariosRepository.cerrarSesion(usuarioAutenticado.id, usuarioAutenticado.sesionId);
  return respuesta(200, { mensaje: 'Sesión cerrada' });
}

// Sesión actual a partir del token: la usa la web al recargar la página (para no pedir el login
// de nuevo) y para renovar el token mientras el usuario sigue trabajando.
// Devuelve lo mismo que el login, con un token nuevo de 1 hora. Si el usuario fue desactivado
// o eliminado mientras tanto, la sesión deja de ser válida.
export async function obtenerSesion(usuarioAutenticado) {
  const registro = await usuariosRepository.buscarPorId(usuarioAutenticado.id);
  if (!registro || !registro.activo) {
    return respuesta(401, { mensaje: 'La sesión ya no es válida. Ingresá de nuevo.' });
  }
  const rol = buscarRol(registro.rolId);
  if (!rol) {
    return respuesta(403, { mensaje: 'El usuario no tiene un rol válido' });
  }
  // El token renovado sigue siendo de la misma sesión.
  return respuesta(200, await armarSesion(registro, rol, 'Sesión renovada', usuarioAutenticado.sesionId));
}

async function armarSesion(registro, rol, mensaje, sesionId) {
  return {
    mensaje,
    usuario: serializarUsuario(registro),
    token: emitirToken(registro, rol, sesionId),
    tokenType: 'Bearer',
    expiresIn: TOKEN_LIFETIME_SECONDS,
    ...(rol.id === 3 ? await datosDelTecnico(registro.id) : {}),
  };
}

function emitirToken(registro, rol, sesionId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 bytes');
  }
  return jwt.sign(
    { rolId: rol.id, sid: sesionId },
    secret,
    {
      algorithm: 'HS256',
      subject: String(registro.id),
      issuer: TOKEN_ISSUER,
      expiresIn: TOKEN_LIFETIME_SECONDS,
    },
  );
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
    jornadaActiva: jornadas.sort((primera, segunda) => new Date(segunda.inicio) - new Date(primera.inicio))[0] || null,
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
