import { Contador, Cliente } from '../models/schemas.js';

class ClientesRepository {
  async listar(filtro = {}) {
    return Cliente.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }, orden = { id: 1 }) {
    const [datos, total] = await Promise.all([
      Cliente.find(filtro).collation({ locale: 'es', strength: 1 }).sort(orden).skip(salto).limit(limite)
        .select('-_id -__v').lean(),
      Cliente.countDocuments(filtro),
    ]);
    return { datos, total };
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

  // El contador se suma en un solo paso dentro de la base ($inc): dos altas al mismo tiempo
  // nunca reciben el mismo id.
  async siguienteId() {
    const contador = await Contador.findOneAndUpdate(
      { _id: 'clientes' },
      { $inc: { valor: 1 } },
      { new: true, upsert: true },
    ).lean();
    return contador.valor;
  }
}

export const clientesRepository = new ClientesRepository();
