import { Vehiculo } from '../models/schemas.js';

class VehiculosRepository {
  async listar(filtro = {}) {
    return Vehiculo.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }, orden = { id: 1 }) {
    const [datos, total] = await Promise.all([
      Vehiculo.find(filtro).collation({ locale: 'es', strength: 1 }).sort(orden).skip(salto).limit(limite)
        .select('-_id -__v').lean(),
      Vehiculo.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  async buscarPorId(id) {
    return Vehiculo.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Vehiculo.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Vehiculo.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Vehiculo.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async siguienteId() {
    const ultimo = await Vehiculo.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const vehiculosRepository = new VehiculosRepository();
