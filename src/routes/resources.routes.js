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
import { clientesCrud } from '../controllers/clientes.controller.js';

const router = Router();

router.get('/usuarios', usuariosCrud.listar);
router.get('/usuarios/:id', usuariosCrud.obtener);
router.post('/usuarios', usuariosCrud.crear);
router.put('/usuarios/:id', usuariosCrud.actualizar);
router.patch('/usuarios/:id', usuariosCrud.actualizar);
router.delete('/usuarios/:id', usuariosCrud.eliminar);
router.get('/tecnicos', tecnicosCrud.listar);
router.get('/tecnicos/:id', tecnicosCrud.obtener);
router.post('/tecnicos', tecnicosCrud.crear);
router.put('/tecnicos/:id', tecnicosCrud.actualizar);
router.patch('/tecnicos/:id', tecnicosCrud.actualizar);
router.delete('/tecnicos/:id', tecnicosCrud.eliminar);
router.get('/clientes', clientesCrud.listar);
router.get('/clientes/:id', clientesCrud.obtener);
router.post('/clientes', clientesCrud.crear);
router.put('/clientes/:id', clientesCrud.actualizar);
router.patch('/clientes/:id', clientesCrud.actualizar);
router.delete('/clientes/:id', clientesCrud.eliminar);

export default router;
