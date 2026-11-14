import { COMPARACION_PATENTE, Contador, Vehiculo } from '../models/schemas.js';

// La base rechazó la escritura porque ya hay un vehículo con esa patente (índice único).
export const esPatenteRepetida = (error) => error?.code === 11000 && Boolean(error.keyPattern?.patente);

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

  // Compara como el índice único: sin distinguir mayúsculas, espacios ni guiones.
  async existePatente(patente) {
    return Boolean(await Vehiculo.exists({ patente }).collation(COMPARACION_PATENTE));
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

  // El contador se suma en un solo paso dentro de la base ($inc): dos altas al mismo tiempo
  // nunca reciben el mismo id.
  async siguienteId() {
    const contador = await Contador.findOneAndUpdate(
      { _id: 'vehiculos' },
      { $inc: { valor: 1 } },
      { new: true, upsert: true },
    ).lean();
    return contador.valor;
  }
}

export const vehiculosRepository = new VehiculosRepository();
