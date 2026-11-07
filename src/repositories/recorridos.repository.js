import { PuntoRecorridoTecnico } from '../models/schemas.js';

class RecorridosRepository {
  async insertarMuchos(puntos) {
    if (!puntos.length) return;
    await PuntoRecorridoTecnico.insertMany(puntos, { ordered: true });
  }

  async listar({ tecnicoId, desde, hasta }) {
    const filtro = { tecnicoId, registradoEn: { $gte: desde, $lte: hasta } };
    return PuntoRecorridoTecnico.find(filtro).sort({ registradoEn: 1 }).select('-_id').lean();
  }
}

export const recorridosRepository = new RecorridosRepository();
