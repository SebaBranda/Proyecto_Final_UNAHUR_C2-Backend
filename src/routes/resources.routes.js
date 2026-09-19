import { Router } from 'express';
import {
  actualizarAsignacion,
  actualizarEstado,
  crearJornada,
  crearReclamo,
  finalizarJornada,
  listar,
} from '../controllers/resources.controller.js';

const router = Router();

router.get('/usuarios', (req, res, next) => listar('usuarios', req, res, next));
router.get('/clientes', (req, res, next) => listar('clientes', req, res, next));
router.get('/vehiculos', (req, res, next) => listar('vehiculos', req, res, next));
router.get('/reclamos', (req, res, next) => listar('reclamos', req, res, next));
router.get('/ubicaciones-tecnicos', (req, res, next) => listar('ubicaciones-tecnicos', req, res, next));
router.get('/jornadas', (req, res, next) => listar('jornadas', req, res, next));

router.post('/reclamos', crearReclamo);
router.patch('/reclamos/:id/asignacion', actualizarAsignacion);
router.patch('/reclamos/:id/estado', actualizarEstado);

router.post('/jornadas', crearJornada);
router.patch('/jornadas/:id/finalizar', finalizarJornada);

export default router;
