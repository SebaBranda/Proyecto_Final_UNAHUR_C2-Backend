import { Jornada } from '../models/schemas.js';

class JornadasRepository {
  async listar(filtro = {}) {
    return Jornada.find(filtro).select('-_id -__v').lean();
  }

  async buscarPorId(id) {
    return Jornada.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Jornada.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Jornada.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Jornada.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async siguienteId() {
    const ultimo = await Jornada.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const jornadasRepository = new JornadasRepository();
