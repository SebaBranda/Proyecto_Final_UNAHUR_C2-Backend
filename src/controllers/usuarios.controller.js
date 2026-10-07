import {
  tecnicosService,
  usuariosService,
} from '../services/usuarios.service.js';

export const usuariosCrud = crearControlador(usuariosService);
export const tecnicosCrud = crearControlador(tecnicosService);

function crearControlador(service) {
  return {
    async listar(req, res) {
      return responder(res, await service.listar({ usuario: req.query.usuario }));
    },
    async obtener(req, res) {
      return responder(res, await service.obtener(req.params.id));
    },
    async crear(req, res) {
      return responder(res, await service.crear(req.body));
    },
    async actualizar(req, res) {
      return responder(res, await service.actualizar(req.params.id, req.body));
    },
    async eliminar(req, res) {
      return responder(res, await service.eliminar(req.params.id));
    },
  };
}

function responder(res, resultado) {
  return res.status(resultado.status).json(resultado.body);
}
