import { reclamosService } from '../services/reclamos.service.js';

const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const reclamosController = {
  listar: async (req, res) => responder(res, await reclamosService.listar(req.usuarioAutenticado, req.query)),
  resumen: async (req, res) => responder(res, await reclamosService.resumen()),
  opciones: async (req, res) => responder(res, await reclamosService.opciones()),
  crear: async (req, res) => responder(res, await reclamosService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => responder(res, await reclamosService.eliminar(req.params.id, req.usuarioAutenticado)),
  asignar: async (req, res) => responder(res, await reclamosService.asignar(req.params.id, req.body, req.usuarioAutenticado)),
  estado: async (req, res) => responder(res, await reclamosService.estado(req.params.id, req.body, req.usuarioAutenticado)),
};
