import { Contador, Jornada } from '../models/schemas.js';

// La base rechazó la escritura porque el técnico ya tiene una jornada activa (índice único).
export const esJornadaActivaRepetida = (error) => error?.code === 11000 && Boolean(error.keyPattern?.tecnicoId);

class JornadasRepository {
  async listar(filtro = {}) {
    return Jornada.find(filtro).select('-_id -__v').lean();
  }

  async listarPaginado(filtro, { salto, limite }, orden = { id: -1 }) {
    const [datos, total] = await Promise.all([
      Jornada.find(filtro).collation({ locale: 'es', strength: 1 }).sort(orden).skip(salto).limit(limite)
        .select('-_id -__v').lean(),
      Jornada.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  // { tecnicoId: horas } de los técnicos indicados (lo suma Mongo). La jornada en curso cuenta
  // hasta ahora.
  async horasPorTecnico(tecnicoIds) {
    const grupos = await Jornada.aggregate([
      { $match: { tecnicoId: { $in: tecnicoIds }, inicio: { $ne: null } } },
      {
        $group: {
          _id: '$tecnicoId',
          milisegundos: { $sum: { $max: [0, { $subtract: [{ $ifNull: ['$fin', '$$NOW'] }, '$inicio'] }] } },
        },
      },
    ]);
    return Object.fromEntries(grupos.map((grupo) => [grupo._id, grupo.milisegundos / 3600000]));
  }

  async buscarPorId(id) {
    return Jornada.findOne({ id }).select('-_id -__v').lean();
  }

  // Jornada en curso del técnico (la más reciente si quedó más de una), o null.
  async buscarActiva(tecnicoId) {
    return Jornada.findOne({ tecnicoId, activa: true }).sort({ inicio: -1 }).select('-_id -__v').lean();
  }

  async crear(datos) {
    const id = datos.id ?? await this.siguienteId();
    return (await Jornada.create({ ...datos, id })).toObject();
  }

  async actualizar(id, cambios) {
    return Jornada.findOneAndUpdate(
      { id },
      { ...cambios, id },
      { new: true, runValidators: true },
    ).select('-_id -__v').lean();
  }

  async eliminar(id) {
    return Jornada.findOneAndDelete({ id }).select('-_id -__v').lean();
  }

  // El contador se suma en un solo paso dentro de la base ($inc): dos altas al mismo tiempo
  // nunca reciben el mismo id.
  async siguienteId() {
    const contador = await Contador.findOneAndUpdate(
      { _id: 'jornadas' },
      { $inc: { valor: 1 } },
      { new: true, upsert: true },
    ).lean();
    return contador.valor;
  }
}

export const jornadasRepository = new JornadasRepository();
