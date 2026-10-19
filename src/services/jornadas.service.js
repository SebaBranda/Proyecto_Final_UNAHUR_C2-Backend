import { jornadasRepository } from '../repositories/jornadas.repository.js';
import { imagenesService } from './imagenes.service.js';

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);
const IMAGENES_CIERRE_JORNADA = 4;

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
    const errorImagenes = await imagenesService.validarReferencias(body?.imagenes, usuario, {
      minimo: IMAGENES_CIERRE_JORNADA,
      maximo: IMAGENES_CIERRE_JORNADA,
    });
    if (errorImagenes) {
      return resultado(400, {
        mensaje: errorImagenes.startsWith('Se requieren')
          ? `Se requieren exactamente ${IMAGENES_CIERRE_JORNADA} imágenes del vehículo para finalizar la jornada.`
          : errorImagenes,
      });
    }
    return resultado(200, await jornadasRepository.actualizar(jornada.id, {
      fin: new Date().toISOString(),
      activa: false,
      controlFinal: elegir(body, ['kilometrajeFinal', 'kilometraje', 'litros', 'estado', 'observaciones', 'imagenes']),
    }));
  },

  async eliminar(jornadaId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar jornadas' });
    const eliminada = await jornadasRepository.eliminar(aId(jornadaId));
    return eliminada ? resultado(200, eliminada) : resultado(404, { mensaje: 'Jornada no encontrada' });
  },
};
