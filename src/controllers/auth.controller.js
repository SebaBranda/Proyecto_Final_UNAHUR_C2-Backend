import { iniciarSesion as autenticarUsuario } from '../services/auth.service.js';

export async function iniciarSesion(req, res, next) {
  try {
    const resultado = await autenticarUsuario(req.body);
    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    return next(error);
  }
}
