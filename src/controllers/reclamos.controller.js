import { reclamosService } from '../services/reclamos.service.js';

// Traduce los pedidos HTTP de reclamos a llamadas al servicio y arma la respuesta.
const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const reclamosController = {
  listar: async (req, res) => responder(res, await reclamosService.listar(req.usuarioAutenticado)),
  crear: async (req, res) => responder(res, await reclamosService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => responder(res, await reclamosService.eliminar(req.params.id, req.usuarioAutenticado)),
  asignar: async (req, res) => responder(res, await reclamosService.asignar(req.params.id, req.body, req.usuarioAutenticado)),
  estado: async (req, res) => responder(res, await reclamosService.estado(req.params.id, req.body, req.usuarioAutenticado)),
  evidencias: async (req, res) => responder(res, await reclamosService.evidencias(req.params.id, req.usuarioAutenticado)),
};
