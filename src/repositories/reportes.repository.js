import { Contador, Reporte } from '../models/schemas.js';

class ReportesRepository {
  // Los reportes propios y los que otros compartieron con el rol del usuario.
  async listarVisibles(usuarioId, rolId) {
    return Reporte.find({ $or: [{ creadoPor: usuarioId }, { compartidoCon: rolId }] })
      .sort({ modificadoEn: -1 }).select('-_id').lean();
  }

  async buscarPorId(id) {
    return Reporte.findOne({ id }).select('-_id').lean();
  }

  async crear(datos) {
    return (await Reporte.create({ ...datos, id: await this.siguienteId() })).toObject();
  }

  async actualizar(id, cambios) {
    return Reporte.findOneAndUpdate({ id }, { ...cambios, modificadoEn: new Date() }, { new: true, runValidators: true })
      .select('-_id').lean();
  }

  async eliminar(id) {
    return Reporte.findOneAndDelete({ id }).select('-_id').lean();
  }

  // El contador se suma en un solo paso dentro de la base ($inc): dos altas al mismo tiempo
  // nunca reciben el mismo id.
  async siguienteId() {
    const contador = await Contador.findOneAndUpdate(
      { _id: 'reportes' },
      { $inc: { valor: 1 } },
      { new: true, upsert: true },
    ).lean();
    return contador.valor;
  }
}

export const reportesRepository = new ReportesRepository();
