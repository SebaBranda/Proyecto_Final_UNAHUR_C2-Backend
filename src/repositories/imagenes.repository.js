import { Imagen, Jornada, Reclamo, Vehiculo } from '../models/schemas.js';

const REFERENCIAS = [
  [Reclamo, ['imagenes', 'inicioServicio.imagenes']],
  [Jornada, ['controlFinal.imagenes']],
  [Vehiculo, ['controles.imagenes', 'ultimoControl.imagenes']],
];

class ImagenesRepository {
  async crear(datos) {
    const { _id, ...imagen } = (await Imagen.create(datos)).toObject();
    return imagen;
  }

  async buscarPorIds(ids) {
    const encontradas = await Imagen.find({ id: { $in: ids } }).select('-_id').lean();
    const porId = new Map(encontradas.map((imagen) => [imagen.id, imagen]));
    return ids.map((id) => porId.get(id)).filter(Boolean);
  }
}

export const imagenesRepository = new ImagenesRepository();
