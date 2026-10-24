import { Cliente } from '../models/schemas.js';

class ClientesRepository {
  async listar(filtro = {}) {
    return Cliente.find(filtro).select('-_id -__v').lean();
  }

  async buscarPorId(id) {
    return Cliente.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Cliente.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Cliente.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Cliente.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async siguienteId() {
    const ultimo = await Cliente.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const clientesRepository = new ClientesRepository();
