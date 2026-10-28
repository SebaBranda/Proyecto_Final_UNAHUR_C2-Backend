import { Reclamo } from '../models/schemas.js';

class ReclamosRepository {
  async listar(filtro = {}) {
    return Reclamo.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }, orden = { id: 1 }) {
    const [datos, total] = await Promise.all([
      Reclamo.find(filtro).collation({ locale: 'es', strength: 1 }).sort(orden).skip(salto).limit(limite)
        .select('-_id -__v').lean(),
      Reclamo.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  // Orden de trabajo del técnico:
  // 1. En progreso.
  // 2. Asignados: primero los urgentes, después los de prioridad alta; dentro de cada prioridad,
  //    la visita programada más cercana primero.
  // 3. Bloqueados y otros estados.
  // 4. Finalizados: el más reciente primero.
  async listarPaginadoParaTecnico(filtro, { salto, limite }) {
    const milisegundos = (campo) => ({
      $toLong: { $convert: { input: campo, to: 'date', onError: null, onNull: null } },
    });
    const [datos, total] = await Promise.all([
      Reclamo.aggregate([
        { $match: filtro },
        {
          $addFields: {
            ordenGrupo: {
              $switch: {
                branches: [
                  { case: { $eq: ['$estado', 'En progreso'] }, then: 0 },
                  { case: { $eq: ['$estado', 'Asignado'] }, then: 1 },
                  { case: { $eq: ['$estado', 'Finalizado'] }, then: 3 },
                ],
                default: 2,
              },
            },
            ordenPrioridad: {
              $cond: [
                { $eq: ['$estado', 'Asignado'] },
                { $switch: { branches: [
                  { case: { $eq: ['$prioridad', 'Urgente'] }, then: 0 },
                  { case: { $eq: ['$prioridad', 'Alta'] }, then: 1 },
                ], default: 2 } },
                0,
              ],
            },
            ordenFecha: {
              $cond: [
                { $eq: ['$estado', 'Asignado'] },
                // Visita más cercana primero; sin fecha, al final del grupo.
                { $ifNull: [milisegundos('$fechaProgramada'), Number.MAX_SAFE_INTEGER] },
                // Resto: el más reciente primero (finalizados por fecha de finalización).
                { $multiply: [-1, { $ifNull: [milisegundos('$finalizadoEn'), milisegundos('$creadoEn'), 0] }] },
              ],
            },
          },
        },
        { $sort: { ordenGrupo: 1, ordenPrioridad: 1, ordenFecha: 1, id: -1 } },
        { $skip: salto },
        { $limit: limite },
        { $project: { _id: 0, __v: 0, ordenGrupo: 0, ordenPrioridad: 0, ordenFecha: 0 } },
      ]),
      Reclamo.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  async contar(filtro = {}) {
    return Reclamo.countDocuments(filtro);
  }

  // { 'Asignado': 3, 'En progreso': 1, ... } para los reclamos que cumplen el filtro.
  async contarPorEstado(filtro = {}) {
    const grupos = await Reclamo.aggregate([{ $match: filtro }, { $group: { _id: '$estado', total: { $sum: 1 } } }]);
    return Object.fromEntries(grupos.map((grupo) => [grupo._id, grupo.total]));
  }

  async buscarPorId(id) {
    return Reclamo.findOne({ id }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Reclamo.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Reclamo.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Reclamo.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  async siguienteId() {
    const ultimo = await Reclamo.findOne().sort({ id: -1 }).select('id').lean();
    return (ultimo?.id ?? 0) + 1;
  }
}

export const reclamosRepository = new ReclamosRepository();
