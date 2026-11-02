import { reportesService } from '../services/reportes.service.js';

const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const reportesController = {
  fuentes: (req, res) => responder(res, reportesService.fuentes(req.usuarioAutenticado.rolId)),
  plantillas: (req, res) => responder(res, reportesService.plantillas(req.usuarioAutenticado.rolId)),
  vistaPrevia: async (req, res) => responder(res, await reportesService.vistaPrevia(req.body?.definicion, req.usuarioAutenticado.rolId, req.body)),
  exportar: async (req, res) => {
    const resultado = await reportesService.exportar(req.body?.definicion, req.body?.columnasVisibles, req.usuarioAutenticado.rolId, req.body?.nombre);
    if (resultado.status !== 200) return responder(res, resultado);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.body.nombre}"`);
    return res.status(200).send(resultado.body.csv);
  },
  listar: async (req, res) => responder(res, await reportesService.listar(req.usuarioAutenticado)),
  obtener: async (req, res) => responder(res, await reportesService.obtener(Number(req.params.id), req.usuarioAutenticado)),
  crear: async (req, res) => responder(res, await reportesService.guardar(req.body, req.usuarioAutenticado)),
  actualizar: async (req, res) => responder(res, await reportesService.guardar(req.body, req.usuarioAutenticado, Number(req.params.id))),
  eliminar: async (req, res) => responder(res, await reportesService.eliminar(Number(req.params.id), req.usuarioAutenticado)),
};
