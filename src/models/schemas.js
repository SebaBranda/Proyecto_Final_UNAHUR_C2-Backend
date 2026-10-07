import mongoose from 'mongoose';

const opcionesBase = { timestamps: true, strict: false };

export const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  nombre: { type: String, required: true, select: false },
  rol: { type: String, required: true },
  activo: { type: Boolean, default: true },
}, opcionesBase)); 

export const Cliente = mongoose.model('Cliente', new mongoose.Schema({
  nombre: { type: String, required: true },
  telefono: String,
  direccion: String,
}, opcionesBase));
