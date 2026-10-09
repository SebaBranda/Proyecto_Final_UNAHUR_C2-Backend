import mongoose from 'mongoose';
import { ROLES } from '../config/roles.js';

const opcionesBase = { timestamps: true, strict: false };
const { Schema } = mongoose;

export const Usuario = mongoose.model('Usuario', new Schema({
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  nombre: { type: String, required: true, select: false },
  rolId: { type: Number, ref: 'Rol', required: true, index: true },
  activo: { type: Boolean, default: true },
}, { timestamps: true }));

export const AdminProfile = mongoose.model('AdminProfile', new Schema({
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  departamento: String,
  nivelAcceso: String,
}, { timestamps: true }));

export const CoordinadorProfile = mongoose.model('CoordinadorProfile', new Schema({
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  zonaAsignada: String,
  maxTecnicosACargo: Number,
}, { timestamps: true }));

export const TecnicoProfile = mongoose.model('TecnicoProfile', new Schema({
  usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  documento: String,
  fechaNacimiento: Date,
  vencimientoRegistro: Date,
  telefono: String,
  email: String,
  direccion: String,
}, { timestamps: true }));

export const Cliente = mongoose.model('Cliente', new Schema({
  nombre: { type: String, required: true },
  telefono: String,
  direccion: String,
}, opcionesBase));

export const Rol = mongoose.model('Rol', new Schema({
  _id: { type: Number, required: true },
  nombre: { type: String, enum: Object.values(ROLES), required: true, unique: true },
  permisos: { type: [String], required: true, default: [] },
}, opcionesBase));
