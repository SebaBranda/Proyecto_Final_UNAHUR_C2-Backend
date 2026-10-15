import { vehiculosService, reclamosService, jornadasService } from '../services/recursos.service.js';
const send = (res, value) => res.status(value.status).json(value.body);
export const vehiculosCrud = {
  listar: async (req, res) => send(res, await vehiculosService.listar(req.usuarioAutenticado)),
  crear: async (req, res) => send(res, await vehiculosService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => send(res, await vehiculosService.eliminar(req.params.id, req.usuarioAutenticado)),
  actualizar: async (req, res) => send(res, await vehiculosService.actualizar(req.params.id, req.body, req.usuarioAutenticado)),
  asignar: async (req, res) => send(res, await vehiculosService.asignar(req.params.id, req.body, req.usuarioAutenticado)),
  kilometraje: async (req, res) => send(res, await vehiculosService.kilometraje(req.params.id, req.body, req.usuarioAutenticado)),
  control: async (req, res) => send(res, await vehiculosService.control(req.params.id, req.body, req.usuarioAutenticado)),
};
export const reclamosCrud = {
  listar: async (req, res) => send(res, await reclamosService.listar(req.usuarioAutenticado)),
  crear: async (req, res) => send(res, await reclamosService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => send(res, await reclamosService.eliminar(req.params.id, req.usuarioAutenticado)),
  asignar: async (req, res) => send(res, await reclamosService.asignar(req.params.id, req.body, req.usuarioAutenticado)),
  estado: async (req, res) => send(res, await reclamosService.estado(req.params.id, req.body, req.usuarioAutenticado)),
};
export const jornadasCrud = {
  listar: async (req, res) => send(res, await jornadasService.listar(req.usuarioAutenticado)),
  crear: async (req, res) => send(res, await jornadasService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => send(res, await jornadasService.eliminar(req.params.id, req.usuarioAutenticado)),
  finalizar: async (req, res) => send(res, await jornadasService.finalizar(req.params.id, req.body, req.usuarioAutenticado)),
};
