import { Reclamo } from '../models/schemas.js';

class ReclamosRepository {
  async listar(filtro = {}) {
    return Reclamo.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }) {
    const [datos, total] = await Promise.all([
      Reclamo.find(filtro).sort({ id: 1 }).skip(salto).limit(limite).select('-_id -__v').lean(),
      Reclamo.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  async contar(filtro = {}) {
    return Reclamo.countDocuments(filtro);
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
