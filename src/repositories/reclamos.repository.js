import { Reclamo } from '../models/schemas.js';

class ReclamosRepository {
  async listar(filtro = {}) {
    return Reclamo.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }, orden = { id: 1 }) {
    const [datos, total] = await Promise.all([
      Reclamo.find(filtro).collation({ locale: 'es', strength: 1 }).sort(orden).skip(salto).limit(limite)
        .select('-_id -__v').lean(),
      Reclamo.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  async contar(filtro = {}) {
    return Reclamo.countDocuments(filtro);
  }

  // { 'Asignado': 3, 'En progreso': 1, ... } para los reclamos que cumplen el filtro.
  async contarPorEstado(filtro = {}) {
    const grupos = await Reclamo.aggregate([{ $match: filtro }, { $group: { _id: '$estado', total: { $sum: 1 } } }]);
    return Object.fromEntries(grupos.map((grupo) => [grupo._id, grupo.total]));
  }

  async buscarPorId(id) {
    return Reclamo.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Reclamo.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Reclamo.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Reclamo.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async siguienteId() {
    const ultimo = await Reclamo.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const reclamosRepository = new ReclamosRepository();
