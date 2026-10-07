import mongoose from 'mongoose';
import { ROLES } from '../config/roles.js';

const opcionesBase = { timestamps: true, strict: false };

export const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  nombre: { type: String, required: true, select: false },
  rolId: { type: Number, ref: 'Rol', required: true, index: true },
  activo: { type: Boolean, default: true },
}, opcionesBase)); 

export const Cliente = mongoose.model('Cliente', new mongoose.Schema({
  nombre: { type: String, required: true },
  telefono: String,
  direccion: String,
}, opcionesBase));

export const Rol = mongoose.model('Rol', new mongoose.Schema({
  _id: { type: Number, required: true },
  nombre: { type: String, enum: Object.values(ROLES), required: true, unique: true },
  permisos: { type: [String], required: true, default: [] },
}, opcionesBase));
