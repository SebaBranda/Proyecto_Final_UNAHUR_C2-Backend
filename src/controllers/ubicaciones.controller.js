import { ubicacionesService } from '../services/ubicaciones.service.js';

export const ubicacionesTecnicos = {
  async listar(req, res) {
    const resultado = await ubicacionesService.listar(req.usuarioAutenticado);
    return res.status(resultado.status).json(resultado.body);
  },

  async actualizar(req, res) {
    const resultado = await ubicacionesService.actualizar(
      req.params.tecnicoId,
      req.body,
      req.usuarioAutenticado,
    );
    return res.status(resultado.status).json(resultado.body);
  },
};
