import { Imagen, Jornada, Reclamo, Vehiculo } from '../models/schemas.js';

// Dónde se guardan los ids de las imágenes: una imagen que no aparece en ninguno de estos campos
// no la usa nadie.
const REFERENCIAS = [
  [Reclamo, ['imagenes', 'inicioServicio.imagenes']],
  [Jornada, ['controlInicial.imagenes', 'controlFinal.imagenes']],
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

  // Borra las imágenes subidas antes de "fecha" que no usa ningún reclamo, jornada ni vehículo.
  // Devuelve cuántas borró.
  async eliminarSinUso(fecha) {
    const listas = await Promise.all(REFERENCIAS.flatMap(([Modelo, campos]) => campos.map((campo) => Modelo.distinct(campo))));
    const enUso = [...new Set(listas.flat().filter((id) => typeof id === 'string'))];
    const { deletedCount } = await Imagen.deleteMany({ creadoEn: { $lt: fecha }, id: { $nin: enUso } });
    return deletedCount;
  }
}

export const imagenesRepository = new ImagenesRepository();
