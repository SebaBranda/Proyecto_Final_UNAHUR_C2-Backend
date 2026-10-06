import jwt from 'jsonwebtoken';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { verifyPassword } from '../services/password.service.js';

const TOKEN_LIFETIME_SECONDS = 60 * 60;

export async function iniciarSesion(req, res, next) {
  try {
    const { usuario, contrasena } = req.body ?? {};
    if (typeof usuario !== 'string' || !usuario.trim()
      || typeof contrasena !== 'string' || !contrasena) {
      return res.status(400).json({ mensaje: 'Se requieren usuario y contraseña' });
    }

    const registro = await usuariosRepository.buscarCredencialesPorUsuario(usuario.trim());
    if (!registro || !registro.activo
      || !await verifyPassword(contrasena, registro.passwordHash)) {
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error('JWT_SECRET debe configurarse con al menos 32 bytes');
    }

    const token = jwt.sign(
      { rol: registro.rol },
      secret,
      {
        algorithm: 'HS256',
        subject: String(registro.id),
        issuer: 'galacticapp-api',
        expiresIn: TOKEN_LIFETIME_SECONDS,
      },
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_LIFETIME_SECONDS,
      usuario: {
        id: registro.id,
        usuario: registro.usuario,
        nombre: registro.nombre,
        rol: registro.rol,
      },
    });
  } catch (error) {
    return next(error);
  }
}
