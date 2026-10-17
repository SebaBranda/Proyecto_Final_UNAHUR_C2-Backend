import { Evidencia } from '../models/schemas.js';

class EvidenciasRepository {
  async listar(filtro = {}) {
    return Evidencia.find(filtro).select('-_id -__v').lean();
  }

  async buscarPorId(id) {
    return Evidencia.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Evidencia.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Evidencia.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Evidencia.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async eliminarPorReclamo(reclamoId) {
    const { deletedCount } = await Evidencia.deleteMany({ reclamoId });
    return deletedCount;
  }

  async siguienteId() {
    const ultimo = await Evidencia.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const evidenciasRepository = new EvidenciasRepository();
