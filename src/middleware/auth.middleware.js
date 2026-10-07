import jwt from 'jsonwebtoken';
import { buscarRol } from '../config/roles.js';

const TOKEN_ISSUER = 'galacticapp-api';

export function autenticar(req, res, next) {
  const token = obtenerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ mensaje: 'Se requiere autenticación' });

  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return next(new Error('JWT_SECRET debe configurarse con al menos 32 bytes'));
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
    });
    const rol = buscarRol(payload.rolId);
    if (!rol) return res.status(403).json({ mensaje: 'El rol del token no es válido' });
    req.usuarioAutenticado = { id: payload.sub, rolId: rol.id, rol: rol.nombre };
    return next();
  } catch {
    return res.status(401).json({ mensaje: 'El token no es válido o ha expirado' });
  }
}

function obtenerToken(autorizacion) {
  if (typeof autorizacion !== 'string') return null;
  const coincidencia = autorizacion.match(/^Bearer\s+(.+)$/i);
  return coincidencia?.[1] ?? null;
}
