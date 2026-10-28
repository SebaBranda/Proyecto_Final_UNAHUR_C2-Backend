import mongoose from 'mongoose';
import { ROLES } from '../config/roles.js';

const opcionesBase = { timestamps: true, strict: false };
const { Schema } = mongoose;

export const Usuario = mongoose.model('Usuario', new Schema({
  id: { type: Number, required: true, unique: true, index: true },
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  nombre: { type: String, required: true, select: false },
  rolId: { type: Number, ref: 'Rol', required: true, index: true },
  activo: { type: Boolean, default: true },
  // Sesión vigente del usuario (una sola por usuario, web o mobile). Cada login la reemplaza.
  // null = sin sesión abierta. No se devuelve en las consultas comunes (select: false).
  sesionId: { type: String, default: null, select: false },
}, { timestamps: true }));

export const AdminProfile = mongoose.model('AdminProfile', new Schema({
  usuarioId: { type: Number, ref: 'Usuario', required: true, unique: true },
  departamento: String,
  nivelAcceso: String,
}, { timestamps: true }));

export const CoordinadorProfile = mongoose.model('CoordinadorProfile', new Schema({
  usuarioId: { type: Number, ref: 'Usuario', required: true, unique: true },
  zonaAsignada: String,
  maxTecnicosACargo: Number,
}, { timestamps: true }));

export const TecnicoProfile = mongoose.model('TecnicoProfile', new Schema({
  usuarioId: { type: Number, ref: 'Usuario', required: true, unique: true },
  documento: String,
  fechaNacimiento: Date,
  vencimientoRegistro: Date,
  telefono: String,
  email: String,
  direccion: String,
}, { timestamps: true }));

export const Cliente = mongoose.model('Cliente', new Schema({
  id: { type: Number, required: true, unique: true, index: true },
  nombre: { type: String, required: true },
  documento: String,
  telefono: String,
  email: String,
  direccion: String,
  activo: { type: Boolean, default: true },
}, opcionesBase));

export const UbicacionTecnico = mongoose.model('UbicacionTecnico', new Schema({
  tecnicoId: { type: Number, required: true, unique: true, index: true },
  latitud: { type: Number, required: true, min: -90, max: 90 },
  longitud: { type: Number, required: true, min: -180, max: 180 },
  actualizadoEn: { type: Date, required: true, default: Date.now },
}, { versionKey: false }));

export const Rol = mongoose.model('Rol', new Schema({
  _id: { type: Number, required: true },
  nombre: { type: String, enum: Object.values(ROLES), required: true, unique: true },
  permisos: { type: [String], required: true, default: [] },
}, opcionesBase));

const recursoBase = { id: { type: Number, required: true, unique: true, index: true } };
export const Vehiculo = mongoose.model('Vehiculo', new Schema({
  ...recursoBase,
  patente: { type: String, required: true },
  tecnicoAsignado: { type: Number, ref: 'Usuario', default: null },
  kilometraje: { type: Schema.Types.Mixed, default: {} },
  seguro: { type: Schema.Types.Mixed, default: {} },
  controles: { type: [Schema.Types.Mixed], default: [] },
}, opcionesBase));

export const Reclamo = mongoose.model('Reclamo', new Schema({
  ...recursoBase,
  clienteId: { type: Number, ref: 'Cliente', required: true, index: true },
  tecnicoId: { type: Number, ref: 'Usuario', default: null, index: true },
  estado: { type: String, default: 'Abierto' },
  creadoEn: { type: Date, default: Date.now },
}, opcionesBase));

export const Imagen = mongoose.model('Imagen', new Schema({
  id: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true },
  tamano: { type: Number, required: true },
  subidoPor: { type: Number, ref: 'Usuario', required: true },
  creadoEn: { type: Date, default: Date.now },
}, { versionKey: false }), 'imagenes');

export const Jornada = mongoose.model('Jornada', new Schema({
  ...recursoBase,
  tecnicoId: { type: Number, ref: 'Usuario', required: true, index: true },
  activa: { type: Boolean, default: true },
  inicio: Date,
  fin: Date,
  controlInicial: Schema.Types.Mixed,
  controlFinal: Schema.Types.Mixed,
}, opcionesBase));
