import {
  iniciarSesion as autenticarUsuario,
  obtenerSesion as sesionActual,
  cerrarSesion as terminarSesion,
} from '../services/auth.service.js';

export async function iniciarSesion(req, res, next) {
  try {
    const resultado = await autenticarUsuario(req.body);
    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return next(error);
  }
}

// GET /auth/sesion: datos de la sesión actual y un token renovado.
export async function obtenerSesion(req, res, next) {
  try {
    const resultado = await sesionActual(req.usuarioAutenticado);
    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return next(error);
  }
}

// POST /auth/logout: cierra la sesión del usuario en todos lados.
export async function cerrarSesion(req, res, next) {
  try {
    const resultado = await terminarSesion(req.usuarioAutenticado);
    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return next(error);
  }
}
