import { Router } from 'express';
import {
  actualizarAsignacion,
  actualizarEstado,
  crearJornada,
  crearReclamo,
  finalizarJornada,
  listar,
} from '../controllers/resources.controller.js';
import { usuariosCrud } from '../controllers/usuarios.controller.js';
import { tecnicosCrud } from '../controllers/tecnicos.controller.js';

const router = Router();

router.get('/usuarios', usuariosCrud.listar);
router.get('/usuarios/:id', usuariosCrud.obtener);
router.post('/usuarios', usuariosCrud.crear);
router.put('/usuarios/:id', usuariosCrud.actualizar);
router.delete('/usuarios/:id', usuariosCrud.eliminar);
router.get('/tecnicos', tecnicosCrud.listar);
router.get('/tecnicos/:id', tecnicosCrud.obtener);
router.post('/tecnicos', tecnicosCrud.crear);
router.put('/tecnicos/:id', tecnicosCrud.actualizar);
router.delete('/tecnicos/:id', tecnicosCrud.eliminar);

export default router;
