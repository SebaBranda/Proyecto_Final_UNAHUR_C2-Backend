import mongoose from 'mongoose';
import { Vehiculo, Reclamo, Jornada } from '../models/schemas.js';
import { vehiculosIniciales, reclamosIniciales, jornadasIniciales } from '../data/store.js';

class MemoryRepository {
  constructor(items) {
    this.items = items.map((item) => structuredClone(item));
    this.next = Math.max(0, ...this.items.map((item) => item.id || 0)) + 1;
  }
  async listar(filtro = {}) { return this.items.filter((x) => coincide(x, filtro)).map(clone); }
  async buscarPorId(id) { const x = this.items.find((item) => item.id === id); return x ? clone(x) : null; }
  async crear(data) { const x = { ...clone(data), id: data.id ?? this.next++ }; this.items.push(x); return clone(x); }
  async actualizar(id, data) { const i = this.items.findIndex((x) => x.id === id); if (i < 0) return null; this.items[i] = { ...this.items[i], ...clone(data), id }; return clone(this.items[i]); }
  async eliminar(id) { const i = this.items.findIndex((x) => x.id === id); if (i < 0) return null; return clone(this.items.splice(i, 1)[0]); }
}

class MongoRepository {
  constructor(Model) { this.Model = Model; }
  async listar(filtro = {}) { return this.Model.find(filtro).select('-_id -__v').lean(); }
  async buscarPorId(id) { return this.Model.findOne({ id }).select('-_id -__v').lean(); }
  async crear(data) { const id = data.id ?? ((await this.Model.findOne().sort({ id: -1 }).select('id').lean())?.id ?? 0) + 1; return (await this.Model.create({ ...data, id })).toObject(); }
  async actualizar(id, data) { return this.Model.findOneAndUpdate({ id }, { ...data, id }, { new: true, runValidators: true }).select('-_id -__v').lean(); }
  async eliminar(id) { return this.Model.findOneAndDelete({ id }).select('-_id -__v').lean(); }
}

function clone(value) { return structuredClone(value); }
function coincide(item, filtro) { return Object.entries(filtro).every(([key, value]) => item[key] === value); }
function proxy(memory, mongo) {
  return new Proxy(memory, { get(target, property) {
    const repo = mongoose.connection.readyState === 1 ? mongo : target;
    const value = repo[property];
    return typeof value === 'function' ? value.bind(repo) : value;
  } });
}

export const vehiculosRepository = proxy(new MemoryRepository(vehiculosIniciales), new MongoRepository(Vehiculo));
export const reclamosRepository = proxy(new MemoryRepository(reclamosIniciales), new MongoRepository(Reclamo));
export const jornadasRepository = proxy(new MemoryRepository(jornadasIniciales), new MongoRepository(Jornada));
