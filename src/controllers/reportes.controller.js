import { reportesService } from '../services/reportes.service.js';

const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

// Nombre del archivo: el del reporte (sin caracteres raros) y la fecha de hoy.
function nombreDeArchivo(nombre) {
  const base = (typeof nombre === 'string' ? nombre : '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'reporte';
  return `${base}-${new Date().toISOString().slice(0, 10)}.csv`;
}

export const reportesController = {
  fuentes: (req, res) => responder(res, reportesService.fuentes(req.usuarioAutenticado)),
  plantillas: (req, res) => responder(res, reportesService.plantillas(req.usuarioAutenticado)),
  vistaPrevia: async (req, res) => responder(res, await reportesService.vistaPrevia(req.body, req.usuarioAutenticado)),
  exportar: async (req, res) => {
    const resultado = await reportesService.exportar(req.body, req.usuarioAutenticado);
    if (resultado.status !== 200) return responder(res, resultado);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreDeArchivo(req.body?.nombre)}"`);
    res.setHeader('X-Total-Filas', String(resultado.body.filas));
    return res.status(200).send(resultado.body.csv);
  },
  listar: async (req, res) => responder(res, await reportesService.listar(req.usuarioAutenticado)),
  obtener: async (req, res) => responder(res, await reportesService.obtener(req.params.id, req.usuarioAutenticado)),
  crear: async (req, res) => responder(res, await reportesService.guardar(req.body, req.usuarioAutenticado)),
  actualizar: async (req, res) => responder(res, await reportesService.guardar(req.body, req.usuarioAutenticado, req.params.id)),
  eliminar: async (req, res) => responder(res, await reportesService.eliminar(req.params.id, req.usuarioAutenticado)),
};
