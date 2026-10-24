import { vehiculosService } from '../services/vehiculos.service.js';

// Traduce los pedidos HTTP de vehículos a llamadas al servicio y arma la respuesta.
const responder = (res, resultado) => res.status(resultado.status).json(resultado.body);

export const vehiculosController = {
  listar: async (req, res) => responder(res, await vehiculosService.listar(req.usuarioAutenticado)),
  opciones: async (req, res) => responder(res, await vehiculosService.opciones()),
  crear: async (req, res) => responder(res, await vehiculosService.crear(req.body, req.usuarioAutenticado)),
  eliminar: async (req, res) => responder(res, await vehiculosService.eliminar(req.params.id, req.usuarioAutenticado)),
  actualizar: async (req, res) => responder(res, await vehiculosService.actualizar(req.params.id, req.body, req.usuarioAutenticado)),
  asignar: async (req, res) => responder(res, await vehiculosService.asignar(req.params.id, req.body, req.usuarioAutenticado)),
  kilometraje: async (req, res) => responder(res, await vehiculosService.kilometraje(req.params.id, req.body, req.usuarioAutenticado)),
  control: async (req, res) => responder(res, await vehiculosService.control(req.params.id, req.body, req.usuarioAutenticado)),
};
