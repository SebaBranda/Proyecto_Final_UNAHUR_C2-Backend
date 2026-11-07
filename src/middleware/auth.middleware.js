import jwt from 'jsonwebtoken';
import { buscarRol } from '../config/roles.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';

const TOKEN_ISSUER = 'galacticapp-api';

export async function autenticar(req, res, next) {
  const token = obtenerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ mensaje: 'Se requiere autenticación' });

  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return next(new Error('JWT_SECRET debe configurarse con al menos 32 bytes'));
  }

  let payload;
  try {
    payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
    });
  } catch {
    return res.status(401).json({ mensaje: 'El token no es válido o ha expirado' });
  }
  const rol = buscarRol(payload.rolId);
  if (!rol) return res.status(403).json({ mensaje: 'El rol del token no es válido' });
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) return res.status(401).json({ mensaje: 'El token no es válido o ha expirado' });

  // Una sola sesión por usuario: el token tiene que ser de la sesión vigente.
  // Si el usuario ingresó desde otro lugar (web o celular), los tokens viejos dejan de servir.
  const usuario = await usuariosRepository.sesionVigente(id);
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ mensaje: 'La sesión ya no es válida. Ingresá de nuevo.' });
  }
  if (!payload.sid || payload.sid !== usuario.sesionId) {
    return res.status(401).json({
      mensaje: 'Tu sesión se cerró porque se ingresó con tu usuario desde otro lugar.',
      codigo: 'SESION_REEMPLAZADA',
    });
  }

  req.usuarioAutenticado = { id, rolId: rol.id, rol: rol.nombre, sesionId: payload.sid };
  return next();
}

function obtenerToken(autorizacion) {
  if (typeof autorizacion !== 'string') return null;
  const coincidencia = autorizacion.match(/^Bearer\s+(.+)$/i);
  return coincidencia?.[1] ?? null;
}
