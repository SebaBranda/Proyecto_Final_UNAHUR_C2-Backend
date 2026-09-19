import mongoose from 'mongoose';

const opcionesBase = { timestamps: true, strict: false };

export const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  contrasena: { type: String, required: true, select: false },
  nombre: { type: String, required: true },
  rol: { type: String, required: true },
  activo: { type: Boolean, default: true },
}, opcionesBase));

export const Cliente = mongoose.model('Cliente', new mongoose.Schema({
  nombre: { type: String, required: true },
  telefono: String,
  direccion: String,
}, opcionesBase));

export const Vehiculo = mongoose.model('Vehiculo', new mongoose.Schema({
  patente: { type: String, required: true, unique: true },
  marca: String,
  modelo: String,
  tecnicoAsignado: Number,
  kilometraje: {
    inicial: Number,
    actual: Number,
    final: Number,
  },
  seguro: mongoose.Schema.Types.Mixed,
  ultimoService: String,
  detalle: String,
  disponible: { type: Boolean, default: true },
}, opcionesBase));

export const Reclamo = mongoose.model('Reclamo', new mongoose.Schema({
  clienteId: Number,
  tipo: String,
  prioridad: String,
  descripcion: String,
  estado: { type: String, default: 'Abierto' },
  tecnicoId: Number,
  fechaProgramada: String,
  agrupacionGeografica: String,
  jornadaId: mongoose.Schema.Types.Mixed,
}, opcionesBase));

export const UbicacionTecnico = mongoose.model('UbicacionTecnico', new mongoose.Schema({
  tecnicoId: { type: Number, required: true },
  latitud: Number,
  longitud: Number,
  actualizadoEn: Date,
  estado: String,
}, opcionesBase));

export const Jornada = mongoose.model('Jornada', new mongoose.Schema({
  tecnicoId: { type: Number, required: true },
  inicio: { type: Date, required: true },
  fin: Date,
  kilometrajeFinal: Number,
  activa: { type: Boolean, default: true },
}, opcionesBase));
