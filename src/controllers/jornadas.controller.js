import { jornadasService } from '../services/jornadas.service.js';

// Traduce los pedidos HTTP de jornadas a llamadas al servicio y arma la respuesta.
const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const jornadasController = {
  listar: async (req, res) => responder(res, await jornadasService.listar(req.usuarioAutenticado, req.query)),
  resumen: async (req, res) => responder(res, await jornadasService.resumen(req.usuarioAutenticado, req.query)),
  crear: async (req, res) => responder(res, await jornadasService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => responder(res, await jornadasService.eliminar(req.params.id, req.usuarioAutenticado)),
  finalizar: async (req, res) => responder(res, await jornadasService.finalizar(req.params.id, req.body, req.usuarioAutenticado)),
};
