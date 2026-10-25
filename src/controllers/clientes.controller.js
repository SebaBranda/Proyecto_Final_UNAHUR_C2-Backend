import { clientesService } from '../services/clientes.service.js';

export const clientesCrud = {
  async listar(req, res) {
    return responder(res, await clientesService.listar(req.usuarioAutenticado, req.query));
  },
  async obtener(req, res) {
    return responder(res, await clientesService.obtener(req.params.id, req.usuarioAutenticado));
  },
  async crear(req, res) {
    return responder(res, await clientesService.crear(req.body));
  },
  async actualizar(req, res) {
    return responder(res, await clientesService.actualizar(req.params.id, req.body));
  },
  async eliminar(req, res) {
    return responder(res, await clientesService.eliminar(req.params.id));
  },
};

function responder(res, resultado) {
  return res.status(resultado.status).json(resultado.body);
}
