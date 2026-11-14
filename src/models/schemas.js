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
  numeroCliente: { type: String, trim: true, index: true },
  pelo: String,
  caja: String,
  documento: String,
  telefono: String,
  email: String,
  direccion: String,
  ubicacion: String,
  activo: { type: Boolean, default: true },
}, opcionesBase));

export const UbicacionTecnico = mongoose.model('UbicacionTecnico', new Schema({
  tecnicoId: { type: Number, required: true, unique: true, index: true },
  latitud: { type: Number, required: true, min: -90, max: 90 },
  longitud: { type: Number, required: true, min: -180, max: 180 },
  actualizadoEn: { type: Date, required: true, default: Date.now },
}, { versionKey: false }));

export const PuntoRecorridoTecnico = mongoose.model('PuntoRecorridoTecnico', new Schema({
  tecnicoId: { type: Number, ref: 'Usuario', required: true, index: true },
  jornadaId: { type: Number, ref: 'Jornada', required: true, index: true },
  latitud: { type: Number, required: true, min: -90, max: 90 },
  longitud: { type: Number, required: true, min: -180, max: 180 },
  registradoEn: { type: Date, required: true, index: true },
  evento: { type: String, enum: ['intervalo', 'inicio_jornada', 'cambio_estado', 'fin_jornada'], default: 'intervalo' },
}, { versionKey: false, collection: 'recorridos_tecnicos' }));

export const Rol = mongoose.model('Rol', new Schema({
  _id: { type: Number, required: true },
  nombre: { type: String, enum: Object.values(ROLES), required: true, unique: true },
  permisos: { type: [String], required: true, default: [] },
}, opcionesBase));

const recursoBase = { id: { type: Number, required: true, unique: true, index: true } };

// Los índices únicos de abajo hacen cumplir reglas del negocio en la propia base: aunque lleguen
// dos pedidos al mismo tiempo (un doble toque), Mongo acepta uno solo.

// Comparación de patentes: no distingue mayúsculas, espacios ni guiones ("AB 123 CD" = "ab-123-cd").
export const COMPARACION_PATENTE = { locale: 'es', strength: 1, alternate: 'shifted' };

const esquemaVehiculo = new Schema({
  ...recursoBase,
  patente: { type: String, required: true },
  tecnicoAsignado: { type: Number, ref: 'Usuario', default: null },
  kilometraje: { type: Schema.Types.Mixed, default: {} },
  seguro: { type: Schema.Types.Mixed, default: {} },
  controles: { type: [Schema.Types.Mixed], default: [] },
}, opcionesBase);
// No puede haber dos vehículos con la misma patente.
esquemaVehiculo.index({ patente: 1 }, { name: 'patente_unica', unique: true, collation: COMPARACION_PATENTE });
export const Vehiculo = mongoose.model('Vehiculo', esquemaVehiculo);

const esquemaReclamo = new Schema({
  ...recursoBase,
  clienteId: { type: Number, ref: 'Cliente', required: true, index: true },
  tecnicoId: { type: Number, ref: 'Usuario', default: null, index: true },
  estado: { type: String, default: 'Abierto' },
  creadoEn: { type: Date, default: Date.now },
}, opcionesBase);
// Un técnico tiene como máximo un reclamo en progreso.
esquemaReclamo.index({ tecnicoId: 1 }, {
  name: 'un_reclamo_en_progreso_por_tecnico',
  unique: true,
  partialFilterExpression: { estado: 'En progreso', tecnicoId: { $type: 'number' } },
});
export const Reclamo = mongoose.model('Reclamo', esquemaReclamo);

export const Imagen = mongoose.model('Imagen', new Schema({
  id: { type: String, required: true, unique: true, index: true },
  // Ubicación del archivo dentro del bucket (ver config/almacenamiento.js).
  clave: { type: String, required: true },
  tamano: { type: Number, required: true },
  subidoPor: { type: Number, ref: 'Usuario', required: true },
  creadoEn: { type: Date, default: Date.now },
}, { versionKey: false }), 'imagenes');

const esquemaJornada = new Schema({
  ...recursoBase,
  tecnicoId: { type: Number, ref: 'Usuario', required: true, index: true },
  activa: { type: Boolean, default: true },
  inicio: Date,
  fin: Date,
  controlInicial: Schema.Types.Mixed,
  controlFinal: Schema.Types.Mixed,
}, opcionesBase);
// Un técnico tiene como máximo una jornada activa.
esquemaJornada.index({ tecnicoId: 1 }, {
  name: 'una_jornada_activa_por_tecnico',
  unique: true,
  partialFilterExpression: { activa: true },
});
export const Jornada = mongoose.model('Jornada', esquemaJornada);

export const Reporte = mongoose.model('Reporte', new Schema({
  id: { type: Number, required: true, unique: true, index: true },
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  definicion: { type: Schema.Types.Mixed, required: true },
  creadoPor: { type: Number, ref: 'Usuario', required: true, index: true },
  compartidoCon: { type: [Number], default: [] },
  creadoEn: { type: Date, default: Date.now },
  modificadoEn: { type: Date, default: Date.now },
}, { versionKey: false }));

// Último id entregado de cada recurso (usuarios, clientes, reclamos, etc.). Cada repositorio pide
// el siguiente con $inc en su siguienteId().
export const Contador = mongoose.model('Contador', new Schema({
  _id: { type: String, required: true },
  valor: { type: Number, required: true, default: 0 },
}, { versionKey: false }), 'contadores');
