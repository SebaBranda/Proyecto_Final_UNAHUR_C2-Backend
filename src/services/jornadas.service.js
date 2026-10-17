import { jornadasRepository } from '../repositories/jornadas.repository.js';

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);
const cantidadFotosRequerida = 4;

function validarFotosFinales(fotos) {
  if (!Array.isArray(fotos) || fotos.length !== cantidadFotosRequerida) {
    return `Se requieren exactamente ${cantidadFotosRequerida} fotos del vehículo para finalizar la jornada`;
  }
  if (fotos.some((foto) => !foto || typeof foto.imagen !== 'string' || !foto.imagen.startsWith('data:image/'))) {
    return 'Las fotos del vehículo no son válidas';
  }
  return null;
}

export const jornadasService = {
  async listar(usuario) {
    const filtro = esGestion(usuario) ? {} : { tecnicoId: aId(usuario.id) };
    return resultado(200, await jornadasRepository.listar(filtro));
  },

  async crear(body, usuario) {
    const tecnicoId = aId(body?.tecnicoId) || aId(usuario.id);
    if (!esGestion(usuario) && tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes iniciar tu propia jornada' });
    }
    return resultado(201, await jornadasRepository.crear({
      tecnicoId,
      activa: true,
      inicio: new Date().toISOString(),
      controlInicial: elegir(body, ['kilometrajeInicial', 'observaciones']),
    }));
  },

  async finalizar(jornadaId, body, usuario) {
    const jornada = await jornadasRepository.buscarPorId(aId(jornadaId));
    if (!jornada) return resultado(404, { mensaje: 'Jornada no encontrada' });
    if (!esGestion(usuario) && jornada.tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes finalizar tu propia jornada' });
    }
    const errorFotos = validarFotosFinales(body?.fotos);
    if (errorFotos) return resultado(400, { mensaje: errorFotos });
    return resultado(200, await jornadasRepository.actualizar(jornada.id, {
      fin: new Date().toISOString(),
      activa: false,
      controlFinal: elegir(body, [
        'kilometrajeFinal', 'kilometraje', 'litros', 'estado', 'observaciones', 'foto', 'fotos',
      ]),
    }));
  },

  async eliminar(jornadaId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar jornadas' });
    const eliminada = await jornadasRepository.eliminar(aId(jornadaId));
    return eliminada ? resultado(200, eliminada) : resultado(404, { mensaje: 'Jornada no encontrada' });
  },
};
