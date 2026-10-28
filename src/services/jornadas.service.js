import { jornadasRepository } from '../repositories/jornadas.repository.js';
import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { imagenesService } from './imagenes.service.js';
import { obtenerPaginacion, respuestaPaginada } from '../utils/paginacion.js';

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
  async listar(usuario, query = {}) {
    const filtro = esGestion(usuario) ? {} : { tecnicoId: aId(usuario.id) };
    const paginacion = obtenerPaginacion(query);
    const pagina = await jornadasRepository.listarPaginado(filtro, paginacion);
    const jornadas = pagina.datos;
    // Servicios finalizados en cada jornada (solo los datos que muestra el resumen).
    const finalizados = await reclamosRepository.listar({
      estado: 'Finalizado',
      jornadaId: { $in: jornadas.map((jornada) => jornada.id) },
    });
    return resultado(200, respuestaPaginada(jornadas.map((jornada) => ({
      ...jornada,
      servicios: finalizados
        .filter((reclamo) => reclamo.jornadaId === jornada.id)
        .map(({ id, tipo, finalizadoEn, fechaProgramada, creadoEn }) => ({ id, tipo, finalizadoEn, fechaProgramada, creadoEn })),
    })), pagina.total, paginacion));
  },

  // Contadores del "Resumen de servicios" del técnico: total de servicios finalizados y cuántos
  // desde la fecha "desde" (inicio de la semana, del mes o del año, calculado por el navegador).
  async resumen(usuario, { desde } = {}) {
    const fechaDesde = desde ? new Date(desde) : null;
    if (fechaDesde && Number.isNaN(fechaDesde.getTime())) {
      return resultado(400, { mensaje: 'La fecha "desde" no es válida' });
    }
    const finalizados = await reclamosRepository.listar({ tecnicoId: aId(usuario.id), estado: 'Finalizado' });
    const fechaDeServicio = (reclamo) => new Date(reclamo.finalizadoEn || reclamo.fechaProgramada || reclamo.creadoEn);
    return resultado(200, {
      totalServicios: finalizados.length,
      serviciosEnPeriodo: fechaDesde
        ? finalizados.filter((reclamo) => fechaDeServicio(reclamo) >= fechaDesde).length
        : finalizados.length,
    });
  },

  async crear(body, usuario) {
    const tecnicoId = aId(body?.tecnicoId) || aId(usuario.id);
    if (!esGestion(usuario) && tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes iniciar tu propia jornada' });
    }
    // Un técnico tiene como máximo una jornada activa.
    if ((await jornadasRepository.listar({ tecnicoId, activa: true })).length) {
      return resultado(409, { mensaje: 'Ya hay una jornada activa. Finalizala antes de iniciar otra.' });
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
    if (!jornada.activa) return resultado(400, { mensaje: 'La jornada ya está finalizada' });
    // El control final (kilometraje, litros, estado y 4 fotos) es del vehículo: si el técnico no
    // tiene uno asignado, la jornada se cierra sin control (solo observaciones, opcionales).
    const [vehiculo] = await vehiculosRepository.listar({ tecnicoAsignado: jornada.tecnicoId });
    if (!vehiculo) {
      return resultado(200, await cerrarJornada(jornada, {
        sinVehiculo: true,
        ...elegir(body, ['observaciones']),
      }));
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
    return resultado(200, await cerrarJornada(
      jornada,
      elegir(body, ['kilometrajeFinal', 'kilometraje', 'litros', 'estado', 'observaciones', 'imagenes']),
    ));
  },

  async eliminar(jornadaId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar jornadas' });
    const eliminada = await jornadasRepository.eliminar(aId(jornadaId));
    return eliminada ? resultado(200, eliminada) : resultado(404, { mensaje: 'Jornada no encontrada' });
  },
};

// Cierra la jornada con su control final.
async function cerrarJornada(jornada, controlFinal) {
  const finalizada = await jornadasRepository.actualizar(jornada.id, {
    fin: new Date().toISOString(),
    activa: false,
    controlFinal,
  });
  // Si quedaron otras jornadas activas del mismo técnico (datos viejos o de prueba), se cierran
  // con duración 0 para que no sumen horas: el técnico deja de figurar en jornada.
  const duplicadas = await jornadasRepository.listar({ tecnicoId: jornada.tecnicoId, activa: true });
  await Promise.all(duplicadas.map((duplicada) => jornadasRepository.actualizar(duplicada.id, {
    activa: false,
    fin: duplicada.inicio,
    cerradaAutomaticamente: true,
  })));
  return finalizada;
}
