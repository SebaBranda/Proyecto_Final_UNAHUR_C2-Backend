import { Router } from 'express';
import { usuariosCrud, tecnicosCrud } from '../controllers/usuarios.controller.js';
import { clientesCrud } from '../controllers/clientes.controller.js';
import { iniciarSesion } from '../controllers/auth.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';
import { autorizarRoles } from '../middleware/authorize.middleware.js';

const router = Router();

router.post('/auth/login', iniciarSesion);
router.use(autenticar);
router.get('/usuarios', usuariosCrud.listar);
router.get('/usuarios/:id', usuariosCrud.obtener);
router.post('/usuarios', autorizarRoles(1), usuariosCrud.crear);
router.put('/usuarios/:id', autorizarRoles(1), usuariosCrud.actualizar);
router.patch('/usuarios/:id', autorizarRoles(1), usuariosCrud.actualizar);
router.delete('/usuarios/:id', autorizarRoles(1), usuariosCrud.eliminar);
router.get('/tecnicos', tecnicosCrud.listar);
router.get('/tecnicos/:id', tecnicosCrud.obtener);
router.get('/clientes', clientesCrud.listar);
router.get('/clientes/:id', clientesCrud.obtener);
router.post('/clientes', clientesCrud.crear);
router.put('/clientes/:id', clientesCrud.actualizar);
router.patch('/clientes/:id', clientesCrud.actualizar);
router.delete('/clientes/:id', clientesCrud.eliminar);

export default router;
