import {
  Cliente,
  Jornada,
  Reclamo,
  UbicacionTecnico,
  Usuario,
  Vehiculo,
} from '../models/schemas.js';
import mongoose from 'mongoose';

const modelos = {
  usuarios: Usuario,
  clientes: Cliente,
  vehiculos: Vehiculo,
  reclamos: Reclamo,
  'ubicaciones-tecnicos': UbicacionTecnico,
  jornadas: Jornada,
};

function obtenerModelo(nombre) {
  return modelos[nombre];
}

export async function listar(nombre, req, res, next) {
  try {
    const Modelo = obtenerModelo(nombre);
    const filtro = req.query.usuario && nombre === 'usuarios'
      ? { usuario: req.query.usuario }
      : {};
    const documentos = await Modelo.find(filtro).select(nombre === 'usuarios' ? '+contrasena' : undefined).lean();
    res.json(documentos.map(({ _id, __v, contrasena, ...documento }) => ({
      ...documento,
      id: documento.id ?? _id,
      ...(contrasena ? { contrasena } : {}),
    })));
  } catch (error) {
    next(error);
  }
}

export async function crearReclamo(req, res, next) {
  try {
    const reclamo = await Reclamo.create({
      ...req.body,
      creadoEn: req.body.creadoEn || new Date().toISOString(),
      estado: req.body.tecnicoId ? 'Asignado' : 'Abierto',
    });
    res.status(201).json(serializar(reclamo));
  } catch (error) {
    next(error);
  }
}

export async function actualizarAsignacion(req, res, next) {
  try {
    const reclamo = await buscarYActualizar(Reclamo, req.params.id,
      { ...req.body, estado: req.body.tecnicoId ? 'Asignado' : 'Abierto' },
      { new: true, runValidators: true },
    );
    if (!reclamo) return res.status(404).json({ mensaje: 'Reclamo no encontrado' });
    return res.json(serializar(reclamo));
  } catch (error) {
    return next(error);
  }
}

export async function actualizarEstado(req, res, next) {
  try {
    const reclamo = await buscarYActualizar(Reclamo, req.params.id, req.body,
      { new: true, runValidators: true },
    );
    if (!reclamo) return res.status(404).json({ mensaje: 'Reclamo no encontrado' });
    return res.json(serializar(reclamo));
  } catch (error) {
    return next(error);
  }
}

export async function crearJornada(req, res, next) {
  try {
    await Jornada.updateMany({ tecnicoId: req.body.tecnicoId, activa: true }, { activa: false, fin: new Date() });
    const jornada = await Jornada.create({ ...req.body, inicio: req.body.inicio || new Date(), activa: true });
    return res.status(201).json(serializar(jornada));
  } catch (error) {
    return next(error);
  }
}

export async function finalizarJornada(req, res, next) {
  try {
    const jornada = await buscarYActualizar(Jornada, req.params.id,
      { ...req.body, fin: req.body.fin || new Date(), activa: false },
      { new: true, runValidators: true },
    );
    if (!jornada) return res.status(404).json({ mensaje: 'Jornada no encontrada' });
    return res.json(serializar(jornada));
  } catch (error) {
    return next(error);
  }
}

function serializar(documento) {
  const objeto = documento.toObject ? documento.toObject() : documento;
  const { _id, __v, ...resto } = objeto;
  return { ...resto, id: resto.id ?? _id };
}

function buscarYActualizar(Modelo, id, cambios, opciones) {
  const filtro = Number.isInteger(Number(id)) && !mongoose.isValidObjectId(id)
    ? { id: Number(id) }
    : { _id: id };
  return Modelo.findOneAndUpdate(filtro, cambios, opciones);
}
