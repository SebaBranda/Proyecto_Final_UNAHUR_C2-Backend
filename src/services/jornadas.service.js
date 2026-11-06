import { jornadasRepository } from '../repositories/jornadas.repository.js';
import { reclamosRepository } from '../repositories/reclamos.repository.js';
import { vehiculosRepository } from '../repositories/vehiculos.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { imagenesService } from './imagenes.service.js';
import { vehiculosService } from './vehiculos.service.js';
import { obtenerPaginacion, respuestaPaginada } from '../utils/paginacion.js';

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const resultado = (status, body) => ({ status, body });
const elegir = (body, campos) => Object.fromEntries(
  campos
    .filter((campo) => Object.prototype.hasOwnProperty.call(body || {}, campo))
    .map((campo) => [campo, body[campo]]),
);
// Fotos del vehículo y del tablero que se piden al iniciar y al finalizar la jornada.
const IMAGENES_CONTROL_JORNADA = 4;
const LARGO_MAXIMO_OBSERVACIONES = 1000;
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

export const jornadasService = {
  async listar(usuario, query = {}) {
    const filtro = esGestion(usuario) ? {} : { tecnicoId: aId(usuario.id) };
    const rango = validarRangoFechas(query);
    if (rango.error) return resultado(400, { mensaje: rango.error });
    if (rango.desde || rango.hasta) filtro.inicio = {
      ...(rango.desde ? { $gte: rango.desde } : {}),
      ...(rango.hasta ? { $lte: rango.hasta } : {}),
    };
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
  // desde/hasta son opcionales; cuando se informan, el hasta incluye todo ese día.
  async resumen(usuario, { desde, hasta } = {}) {
    const rango = validarRangoFechas({ desde, hasta });
    if (rango.error) return resultado(400, { mensaje: rango.error });
    // Incluye la jornada en curso: sus horas se cuentan hasta ahora (así "Hoy" no da 0 mientras trabaja).
    const [finalizados, jornadas] = await Promise.all([
      reclamosRepository.listar({ tecnicoId: aId(usuario.id), estado: 'Finalizado' }),
      jornadasRepository.listar({ tecnicoId: aId(usuario.id) }),
    ]);
    const fechaDeServicio = (reclamo) => new Date(reclamo.finalizadoEn || reclamo.fechaProgramada || reclamo.creadoEn);
    const jornadasDelPeriodo = jornadas.filter((jornada) => (
      (!rango.desde || new Date(jornada.inicio) >= rango.desde)
      && (!rango.hasta || new Date(jornada.inicio) <= rango.hasta)
    ));
    const horasTrabajadas = jornadasDelPeriodo.reduce((total, jornada) => (
      total + Math.max(0, (jornada.fin ? new Date(jornada.fin) : new Date()) - new Date(jornada.inicio)) / 3600000
    ), 0);
    return resultado(200, {
      totalServicios: finalizados.length,
      horasTrabajadas: Number(horasTrabajadas.toFixed(1)),
      serviciosEnPeriodo: rango.desde || rango.hasta
        ? finalizados.filter((reclamo) => (
          (!rango.desde || fechaDeServicio(reclamo) >= rango.desde)
          && (!rango.hasta || fechaDeServicio(reclamo) <= rango.hasta)
        )).length
        : finalizados.length,
    });
  },

  async crear(body, usuario) {
    const tecnicoId = aId(body?.tecnicoId) || aId(usuario.id);
    if (!esGestion(usuario) && tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes iniciar tu propia jornada' });
    }
    if (esGestion(usuario)) {
      const tecnico = tecnicoId ? await usuariosRepository.buscarPorId(tecnicoId, { rolId: 3 }) : null;
      if (!tecnico) return resultado(400, { mensaje: 'El técnico indicado no existe' });
      if (tecnico.activo === false) return resultado(400, { mensaje: 'El técnico indicado está dado de baja' });
    }
    if (typeof body?.observaciones === 'string' && body.observaciones.length > LARGO_MAXIMO_OBSERVACIONES) {
      return resultado(400, { mensaje: `Las observaciones admiten hasta ${LARGO_MAXIMO_OBSERVACIONES} caracteres` });
    }
    // Un técnico tiene como máximo una jornada activa.
    if ((await jornadasRepository.listar({ tecnicoId, activa: true })).length) {
      return resultado(409, { mensaje: 'Ya hay una jornada activa. Finalizala antes de iniciar otra.' });
    }
    // Con vehículo, la jornada empieza con el control del vehículo (kilometraje, litros, estado y
    // 4 fotos), que también queda registrado en el vehículo. Los reclamos se comienzan sin control.
    let controlInicial = elegir(body, ['observaciones']);
    const [vehiculo] = await vehiculosRepository.listar({ tecnicoAsignado: tecnicoId });
    if (vehiculo) {
      const control = esObjeto(body?.controlInicial) ? body.controlInicial : {};
      const kilometraje = Number(control.kilometraje);
      const litros = Number(control.litros);
      const kilometrajeActual = Number(vehiculo.kilometraje?.actual) || 0;
      if (control.kilometraje == null || control.kilometraje === '' || !Number.isFinite(kilometraje)) {
        return resultado(400, { mensaje: 'Completá el kilometraje del tablero para iniciar la jornada.' });
      }
      if (kilometraje < kilometrajeActual) {
        return resultado(400, { mensaje: `El kilometraje no puede ser menor al actual del vehículo (${kilometrajeActual} km).` });
      }
      if (control.litros == null || control.litros === '' || !Number.isFinite(litros) || litros < 0) {
        return resultado(400, { mensaje: 'Completá los litros de nafta.' });
      }
      const errorImagenes = await imagenesService.validarReferencias(control.imagenes, usuario, {
        minimo: IMAGENES_CONTROL_JORNADA,
        maximo: IMAGENES_CONTROL_JORNADA,
      });
      if (errorImagenes) {
        return resultado(400, {
          mensaje: errorImagenes.startsWith('Se requieren')
            ? `Se requieren exactamente ${IMAGENES_CONTROL_JORNADA} imágenes del vehículo para iniciar la jornada.`
            : errorImagenes,
        });
      }
      const datosControl = {
        kilometraje, litros, estado: control.estado || 'Activo', imagenes: control.imagenes,
      };
      const registro = await vehiculosService.control(vehiculo.id, datosControl, usuario);
      if (registro.status !== 200) return registro;
      controlInicial = {
        ...controlInicial, ...datosControl, kilometrajeInicial: kilometraje, vehiculoId: vehiculo.id,
      };
    }
    return resultado(201, await jornadasRepository.crear({
      tecnicoId,
      activa: true,
      inicio: new Date().toISOString(),
      controlInicial,
    }));
  },

  async finalizar(jornadaId, body, usuario) {
    const jornada = await jornadasRepository.buscarPorId(aId(jornadaId));
    if (!jornada) return resultado(404, { mensaje: 'Jornada no encontrada' });
    if (!esGestion(usuario) && jornada.tecnicoId !== aId(usuario.id)) {
      return resultado(403, { mensaje: 'Solo puedes finalizar tu propia jornada' });
    }
    if (!jornada.activa) return resultado(400, { mensaje: 'La jornada ya está finalizada' });
    if (typeof body?.observaciones === 'string' && body.observaciones.length > LARGO_MAXIMO_OBSERVACIONES) {
      return resultado(400, { mensaje: `Las observaciones admiten hasta ${LARGO_MAXIMO_OBSERVACIONES} caracteres` });
    }
    // El control final (kilometraje, litros, estado y 4 fotos) es del vehículo: si el técnico no
    // tiene uno asignado, la jornada se cierra sin control (solo observaciones, opcionales).
    const [vehiculo] = await vehiculosRepository.listar({ tecnicoAsignado: jornada.tecnicoId });
    if (!vehiculo) {
      return resultado(200, await cerrarJornada(jornada, {
        sinVehiculo: true,
        ...elegir(body, ['observaciones']),
      }));
    }
    // Con vehículo, el control final (kilometraje, litros, estado y 4 fotos) se registra también en
    // el vehículo, en el mismo pedido (igual que al iniciar la jornada).
    const kilometraje = Number(body?.kilometraje);
    const litros = Number(body?.litros);
    const kilometrajeActual = Number(vehiculo.kilometraje?.actual) || 0;
    if (body?.kilometraje == null || body.kilometraje === '' || !Number.isFinite(kilometraje)) {
      return resultado(400, { mensaje: 'Completá el kilometraje del tablero para finalizar la jornada.' });
    }
    if (kilometraje < kilometrajeActual) {
      return resultado(400, { mensaje: `El kilometraje no puede ser menor al actual del vehículo (${kilometrajeActual} km).` });
    }
    if (body.litros == null || body.litros === '' || !Number.isFinite(litros) || litros < 0) {
      return resultado(400, { mensaje: 'Completá los litros de nafta.' });
    }
    const errorImagenes = await imagenesService.validarReferencias(body.imagenes, usuario, {
      minimo: IMAGENES_CONTROL_JORNADA,
      maximo: IMAGENES_CONTROL_JORNADA,
    });
    if (errorImagenes) {
      return resultado(400, {
        mensaje: errorImagenes.startsWith('Se requieren')
          ? `Se requieren exactamente ${IMAGENES_CONTROL_JORNADA} imágenes del vehículo para finalizar la jornada.`
          : errorImagenes,
      });
    }
    const datosControl = {
      kilometraje,
      litros,
      estado: body.estado || 'Activo',
      imagenes: body.imagenes,
      ...elegir(body, ['observaciones']),
    };
    const registro = await vehiculosService.control(vehiculo.id, datosControl, usuario);
    if (registro.status !== 200) return registro;
    return resultado(200, await cerrarJornada(jornada, {
      ...datosControl, kilometrajeFinal: kilometraje, vehiculoId: vehiculo.id,
    }));
  },

  async eliminar(jornadaId, usuario) {
    if (!esGestion(usuario)) return resultado(403, { mensaje: 'Solo admin o coordinador pueden eliminar jornadas' });
    const eliminada = await jornadasRepository.eliminar(aId(jornadaId));
    return eliminada ? resultado(200, eliminada) : resultado(404, { mensaje: 'Jornada no encontrada' });
  },
};

function validarRangoFechas({ desde, hasta } = {}) {
  const fechaDesde = convertirFecha(desde, false);
  const fechaHasta = convertirFecha(hasta, true);
  if (desde && !fechaDesde) return { error: 'La fecha "desde" no es válida' };
  if (hasta && !fechaHasta) return { error: 'La fecha "hasta" no es válida' };
  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    return { error: 'La fecha "desde" debe ser anterior o igual a "hasta"' };
  }
  return { desde: fechaDesde, hasta: fechaHasta };
}

function convertirFecha(valor, finDelDia) {
  if (!valor) return null;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(valor))
    ? new Date(`${valor}T${finDelDia ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

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
