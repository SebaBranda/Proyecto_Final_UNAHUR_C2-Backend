import { imagenesService } from '../services/imagenes.service.js';

const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const imagenesController = {
  subir: async (req, res) => responder(res, await imagenesService.subir(req.body?.imagenes, req.usuarioAutenticado)),
  listar: async (req, res) => responder(res, await imagenesService.obtener(String(req.query.ids || '').split(','))),
  obtener: async (req, res) => responder(res, await imagenesService.obtenerUna(req.params.id)),
};
