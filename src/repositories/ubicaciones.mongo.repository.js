import { UbicacionTecnico } from '../models/schemas.js';

export class UbicacionesMongoRepository {
  async listar() {
    return UbicacionTecnico.find().select('-_id').lean();
  }

  async listarPorTecnico(tecnicoId) {
    const ubicacion = await UbicacionTecnico.findOne({ tecnicoId }).select('-_id').lean();
    return ubicacion ? [ubicacion] : [];
  }

  async actualizar(tecnicoId, { latitud, longitud }) {
    return UbicacionTecnico.findOneAndUpdate(
      { tecnicoId },
      {
        tecnicoId,
        latitud,
        longitud,
        actualizadoEn: new Date(),
      },
      { upsert: true, new: true, runValidators: true, projection: { _id: 0 } },
    ).lean();
  }
}
