import { FUENTES, columnasPermitidas } from './reportes/fuentes/index.js';
import { PLANTILLAS } from './reportes/plantillas.js';
import {
  cumple, operadoresDe, textoBuscable, validarCantidadDeFiltros, validarFiltro,
} from './reportes/filtros.js';
import {
  aFecha, diaArgentina, fechaParaCsv, mesDe,
} from './reportes/fechas.js';
import { crearCsv } from '../utils/csv.js';
import { obtenerPaginacion, respuestaPaginada } from '../utils/paginacion.js';
import { reportesRepository } from '../repositories/reportes.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';

const MAXIMO_FILAS_CSV = 10000;
const MAXIMO_OPCIONES = 200;
const ROLES = { 1: 'los administradores', 2: 'los coordinadores' };
const TIPOS_AGRUPABLES = new Set(['lista', 'texto', 'booleano', 'fecha', 'dia']);
const CALCULOS = new Set(['cantidad', 'suma', 'promedio']);
const SIN_DATO = 'Sin dato';

const resultado = (status, body) => ({ status, body });
const fallo = (status, mensaje) => ({ error: resultado(status, { mensaje }) });
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const redondear = (numero) => Math.round(numero * 100) / 100;
const aId = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);

// ---------- Catálogo ----------

const describirColumna = ({ campo, etiqueta, tipo, opciones }) => ({
  campo, etiqueta, tipo, operadores: operadoresDe(tipo), ...(opciones ? { opciones } : {}),
});

function describirFuente(fuente, rolId) {
  const columnas = columnasPermitidas(fuente, rolId);
  const campos = new Set(columnas.map((columna) => columna.campo));
  return {
    clave: fuente.clave,
    etiqueta: fuente.etiqueta,
    descripcion: fuente.descripcion,
    sustantivo: fuente.sustantivo,
    columnas: columnas.map(describirColumna),
    columnasPorDefecto: fuente.columnasPorDefecto.filter((campo) => campos.has(campo)),
    ordenPorDefecto: fuente.ordenPorDefecto,
    columnaPeriodo: fuente.columnaPeriodo,
    filtrosRapidos: fuente.filtrosRapidos.filter((campo) => campos.has(campo)),
  };
}

// ---------- Validación de la definición ----------

// Valida la definición contra el catálogo de la fuente y las columnas que puede ver el rol.
// Devuelve { error } o { fuente, disponibles, definicion } (la definición normalizada).
function validarDefinicion(definicion, rolId) {
  if (!esObjeto(definicion)) return fallo(400, 'Falta la definición del reporte.');
  const fuente = FUENTES[definicion.fuente];
  if (!fuente) return fallo(400, 'La fuente de datos no es válida.');
  if (!fuente.roles.includes(rolId)) return fallo(403, 'No tenés permiso para usar esta fuente de datos.');
  const disponibles = new Map(columnasPermitidas(fuente, rolId).map((columna) => [columna.campo, columna]));
  const {
    columnas, filtros = [], orden = null, agrupacion = null,
  } = definicion;

  if (!Array.isArray(columnas) || !columnas.length) return fallo(400, 'Elegí al menos una columna.');
  const columnaInvalida = columnas.find((campo) => !disponibles.has(campo));
  if (columnaInvalida !== undefined) return fallo(400, `La columna "${columnaInvalida}" no está disponible.`);
  if (new Set(columnas).size !== columnas.length) return fallo(400, 'Hay columnas repetidas.');

  if (!Array.isArray(filtros)) return fallo(400, 'Los filtros no son válidos.');
  const errorFiltros = validarCantidadDeFiltros(filtros)
    || filtros.map((filtro) => validarFiltro(filtro, disponibles.get(filtro?.campo))).find(Boolean);
  if (errorFiltros) return fallo(400, errorFiltros);

  if (orden !== null && (!esObjeto(orden) || !disponibles.has(orden.campo) || !['asc', 'desc'].includes(orden.sentido))) {
    return fallo(400, 'El orden elegido no es válido para esta fuente de datos.');
  }

  if (agrupacion !== null) {
    if (!esObjeto(agrupacion) || !TIPOS_AGRUPABLES.has(disponibles.get(agrupacion.por)?.tipo)) {
      return fallo(400, 'No se puede hacer un resumen por esa columna.');
    }
    if (!CALCULOS.has(agrupacion.calculo)) return fallo(400, 'El cálculo del resumen no es válido.');
    if (agrupacion.calculo !== 'cantidad' && disponibles.get(agrupacion.campo)?.tipo !== 'numero') {
      return fallo(400, 'Para sumar o promediar, elegí una columna numérica.');
    }
  }

  return {
    fuente,
    disponibles,
    definicion: {
      fuente: fuente.clave,
      columnas,
      filtros: filtros.map(({ campo, operador, valor }) => ({ campo, operador, ...(valor !== undefined ? { valor } : {}) })),
      orden,
      agrupacion: agrupacion && {
        por: agrupacion.por,
        calculo: agrupacion.calculo,
        ...(agrupacion.calculo !== 'cantidad' ? { campo: agrupacion.campo } : {}),
      },
    },
  };
}

// Columnas que usa la definición (para saber si se puede compartir con otro rol).
const camposUsados = ({ columnas, filtros, orden, agrupacion }) => new Set([
  ...columnas,
  ...filtros.map((filtro) => filtro.campo),
  ...(orden ? [orden.campo] : []),
  ...(agrupacion ? [agrupacion.por, agrupacion.campo].filter(Boolean) : []),
]);

// ---------- Valores ----------

// Texto de un valor tal como sale en el CSV (y como se busca con la búsqueda rápida).
function valorComoTexto(valor, tipo) {
  if (valor == null || valor === '') return '';
  if (tipo === 'booleano') return valor ? 'Sí' : 'No';
  if (tipo === 'fecha') return fechaParaCsv(valor, true);
  if (tipo === 'dia') return fechaParaCsv(valor, false);
  if (tipo === 'numero') {
    const numero = Number(valor);
    return Number.isFinite(numero) ? String(redondear(numero)).replace('.', ',') : '';
  }
  return String(valor);
}

// Valor que se envía a la web: fechas con hora en ISO, días como "AAAA-MM-DD" (en Argentina) y
// números redondeados a 2 decimales.
function valorParaWeb(valor, tipo) {
  if (valor == null || valor === '') return valor ?? null;
  if (tipo === 'fecha') return aFecha(valor)?.toISOString() ?? null;
  if (tipo === 'dia') {
    const fecha = aFecha(valor);
    return fecha ? diaArgentina(fecha) : null;
  }
  if (tipo === 'numero') return Number.isFinite(Number(valor)) ? redondear(Number(valor)) : null;
  return valor;
}

// Cada fila viaja solo con las columnas que el rol puede ver (nunca el registro completo).
const proyectar = (fila, disponibles) => Object.fromEntries(
  [...disponibles.values()].map((columna) => [columna.campo, valorParaWeb(fila[columna.campo], columna.tipo)]),
);

function comparar(a, b, tipo) {
  const vacioA = a == null || a === '';
  const vacioB = b == null || b === '';
  if (vacioA || vacioB) return vacioA === vacioB ? 0 : (vacioA ? 1 : -1);
  if (tipo === 'numero') return Number(a) - Number(b);
  if (tipo === 'fecha' || tipo === 'dia') return (aFecha(a)?.getTime() ?? 0) - (aFecha(b)?.getTime() ?? 0);
  if (tipo === 'booleano') return Number(b) - Number(a);
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
}

// ---------- Ejecución ----------

async function ejecutar({ fuente, disponibles, definicion }, { buscar } = {}) {
  const todas = await fuente.filas();
  let filas = todas.filter((fila) => definicion.filtros
    .every((filtro) => cumple(fila[filtro.campo], filtro, disponibles.get(filtro.campo).tipo)));

  const termino = textoBuscable(typeof buscar === 'string' ? buscar.slice(0, 100) : '');
  if (termino) {
    filas = filas.filter((fila) => definicion.columnas.some((campo) => (
      textoBuscable(valorComoTexto(fila[campo], disponibles.get(campo).tipo)).includes(termino)
    )));
  }

  if (definicion.orden) {
    const { campo, sentido } = definicion.orden;
    const { tipo } = disponibles.get(campo);
    filas.sort((a, b) => {
      const vacioA = a[campo] == null || a[campo] === '';
      const vacioB = b[campo] == null || b[campo] === '';
      if (vacioA || vacioB) return comparar(a[campo], b[campo], tipo); // los vacíos siempre al final
      return comparar(a[campo], b[campo], tipo) * (sentido === 'desc' ? -1 : 1);
    });
  }

  // Valores posibles de cada columna de tipo lista (para los desplegables de los filtros).
  const opciones = Object.fromEntries([...disponibles.values()]
    .filter((columna) => columna.tipo === 'lista')
    .map((columna) => {
      const valores = new Set(columna.opciones || []);
      todas.forEach((fila) => { if (fila[columna.campo]) valores.add(String(fila[columna.campo])); });
      const ordenados = [...valores].sort((a, b) => (columna.opciones
        ? 0 : a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true })));
      return [columna.campo, ordenados.slice(0, MAXIMO_OPCIONES)];
    }));

  const indicadores = fuente.indicadores(filas).map((indicador) => ({
    ...indicador,
    valor: indicador.valor == null ? null : redondear(indicador.valor),
  }));

  return { filas, opciones, indicadores };
}

function etiquetaDelCalculo(agrupacion, fuente, disponibles) {
  if (agrupacion.calculo === 'cantidad') return `Cantidad de ${fuente.sustantivo.plural}`;
  const columna = disponibles.get(agrupacion.campo).etiqueta;
  return agrupacion.calculo === 'suma' ? `Suma de ${columna}` : `Promedio de ${columna}`;
}

// Resumen: agrupa las filas por una columna (las fechas, por mes) y calcula cantidad, suma o promedio.
function resumir(filas, { por, calculo, campo }, disponibles) {
  const { tipo } = disponibles.get(por);
  const grupos = new Map();
  filas.forEach((fila) => {
    const valor = fila[por];
    let clave;
    let etiqueta;
    if (tipo === 'fecha' || tipo === 'dia') {
      const mes = mesDe(valor);
      clave = mes?.clave ?? '';
      etiqueta = mes?.etiqueta ?? SIN_DATO;
    } else if (tipo === 'booleano') {
      clave = valor === true ? 'si' : 'no';
      etiqueta = valor === true ? 'Sí' : 'No';
    } else {
      clave = valor == null ? '' : String(valor).trim();
      etiqueta = clave || SIN_DATO;
    }
    const grupo = grupos.get(clave) || { clave, etiqueta, cantidad: 0, suma: 0, conValor: 0 };
    grupo.cantidad += 1;
    const numero = campo ? Number(fila[campo]) : NaN;
    if (campo && fila[campo] != null && fila[campo] !== '' && Number.isFinite(numero)) {
      grupo.suma += numero;
      grupo.conValor += 1;
    }
    grupos.set(clave, grupo);
  });

  const lista = [...grupos.values()].map((grupo) => ({
    clave: grupo.clave,
    etiqueta: grupo.etiqueta,
    cantidad: grupo.cantidad,
    valor: calculo === 'cantidad' ? grupo.cantidad
      : calculo === 'suma' ? grupo.suma
        : (grupo.conValor ? grupo.suma / grupo.conValor : null),
  }));
  // El porcentaje solo tiene sentido para cantidades y sumas (no para promedios).
  const total = calculo === 'promedio' ? 0 : lista.reduce((suma, grupo) => suma + (grupo.valor || 0), 0);
  const conPorcentaje = lista.map((grupo) => ({
    ...grupo,
    valor: grupo.valor == null ? null : redondear(grupo.valor),
    porcentaje: total ? redondear((grupo.valor * 100) / total) : null,
  }));
  // Por mes, en orden cronológico; el resto, de mayor a menor. "Sin dato" siempre al final.
  return conPorcentaje.sort((a, b) => {
    if (!a.clave || !b.clave) return a.clave ? -1 : (b.clave ? 1 : 0);
    if (tipo === 'fecha' || tipo === 'dia') return a.clave.localeCompare(b.clave);
    return (b.valor ?? -Infinity) - (a.valor ?? -Infinity) || a.etiqueta.localeCompare(b.etiqueta, 'es');
  });
}

// ---------- Reportes guardados ----------

async function nombresDeAutores(reportes, usuario) {
  const ids = [...new Set(reportes.map((reporte) => reporte.creadoPor).filter((id) => id !== usuario.id))];
  const autores = await Promise.all(ids.map((id) => usuariosRepository.buscarPorId(id)));
  return new Map(ids.map((id, indice) => [id, autores[indice]?.nombre || 'Otro usuario']));
}

const describirGuardado = (reporte, usuario, autores) => ({
  id: reporte.id,
  nombre: reporte.nombre,
  descripcion: reporte.descripcion || '',
  definicion: reporte.definicion,
  compartidoCon: reporte.compartidoCon || [],
  creadoEn: reporte.creadoEn,
  modificadoEn: reporte.modificadoEn,
  esAutor: reporte.creadoPor === usuario.id,
  puedeEditar: reporte.creadoPor === usuario.id || usuario.rolId === 1,
  autor: reporte.creadoPor === usuario.id ? null : autores.get(reporte.creadoPor) || 'Otro usuario',
});

const puedeVer = (reporte, usuario) => reporte.creadoPor === usuario.id || (reporte.compartidoCon || []).includes(usuario.rolId);

// ---------- Servicio ----------

export const reportesService = {
  fuentes(usuario) {
    return resultado(200, {
      fuentes: Object.values(FUENTES)
        .filter((fuente) => fuente.roles.includes(usuario.rolId))
        .map((fuente) => describirFuente(fuente, usuario.rolId)),
    });
  },

  plantillas(usuario) {
    return resultado(200, PLANTILLAS.filter((plantilla) => !validarDefinicion(plantilla.definicion, usuario.rolId).error));
  },

  // Resultado de una definición: { vista: 'lista', datos, paginacion, ... } o, si tiene agrupación,
  // { vista: 'resumen', grupos, ... }. Las filas traen solo las columnas que el rol puede ver.
  async vistaPrevia(cuerpo, usuario) {
    const validada = validarDefinicion(cuerpo?.definicion, usuario.rolId);
    if (validada.error) return validada.error;
    const { fuente, disponibles, definicion } = validada;
    const { filas, opciones, indicadores } = await ejecutar(validada, { buscar: cuerpo.buscar });
    const comun = {
      columnas: [...disponibles.values()].map(describirColumna),
      total: filas.length,
      indicadores,
      opciones,
    };
    if (definicion.agrupacion) {
      return resultado(200, {
        vista: 'resumen',
        ...comun,
        encabezados: {
          grupo: disponibles.get(definicion.agrupacion.por).etiqueta,
          valor: etiquetaDelCalculo(definicion.agrupacion, fuente, disponibles),
        },
        grupos: resumir(filas, definicion.agrupacion, disponibles),
      });
    }
    const paginacion = obtenerPaginacion({ pagina: cuerpo.pagina, limite: cuerpo.limite });
    const pagina = filas.slice(paginacion.salto, paginacion.salto + paginacion.limite);
    return resultado(200, {
      vista: 'lista',
      ...comun,
      ...respuestaPaginada(pagina.map((fila) => proyectar(fila, disponibles)), filas.length, paginacion),
    });
  },

  // CSV con exactamente lo que se ve: las columnas elegidas, los filtros, la búsqueda y el orden
  // (o el resumen, si el reporte está agrupado), sin paginar.
  async exportar(cuerpo, usuario) {
    const validada = validarDefinicion(cuerpo?.definicion, usuario.rolId);
    if (validada.error) return validada.error;
    const { fuente, disponibles, definicion } = validada;
    const { filas } = await ejecutar(validada, { buscar: cuerpo.buscar });
    if (filas.length > MAXIMO_FILAS_CSV) {
      return resultado(400, { mensaje: `El reporte tiene ${filas.length} filas y el máximo para exportar es ${MAXIMO_FILAS_CSV}. Agregá filtros para achicarlo.` });
    }

    let csv;
    if (definicion.agrupacion) {
      const columnas = [
        { campo: 'etiqueta', etiqueta: disponibles.get(definicion.agrupacion.por).etiqueta, tipo: 'texto' },
        { campo: 'valor', etiqueta: etiquetaDelCalculo(definicion.agrupacion, fuente, disponibles), tipo: 'numero' },
        ...(definicion.agrupacion.calculo === 'promedio' ? [] : [{ campo: 'porcentaje', etiqueta: '% del total', tipo: 'numero' }]),
      ];
      const grupos = resumir(filas, definicion.agrupacion, disponibles).map((grupo) => ({
        etiqueta: grupo.etiqueta,
        valor: valorComoTexto(grupo.valor, 'numero'),
        porcentaje: valorComoTexto(grupo.porcentaje, 'numero'),
      }));
      csv = crearCsv(columnas, grupos);
    } else {
      const columnas = definicion.columnas.map((campo) => disponibles.get(campo));
      csv = crearCsv(columnas, filas.map((fila) => Object.fromEntries(
        columnas.map((columna) => [columna.campo, valorComoTexto(fila[columna.campo], columna.tipo)]),
      )));
    }
    return resultado(200, { csv, filas: filas.length });
  },

  async listar(usuario) {
    const reportes = await reportesRepository.listarVisibles(usuario.id, usuario.rolId);
    const autores = await nombresDeAutores(reportes, usuario);
    return resultado(200, reportes.map((reporte) => describirGuardado(reporte, usuario, autores)));
  },

  async obtener(idParametro, usuario) {
    const reporte = aId(idParametro) && await reportesRepository.buscarPorId(aId(idParametro));
    if (!reporte || !puedeVer(reporte, usuario)) return resultado(404, { mensaje: 'Reporte no encontrado' });
    const autores = await nombresDeAutores([reporte], usuario);
    return resultado(200, describirGuardado(reporte, usuario, autores));
  },

  // Crea (sin id) o modifica (con id) un reporte guardado. Solo el autor o un administrador lo modifica.
  async guardar(body, usuario, idParametro = null) {
    const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
    if (!nombre || nombre.length > 80) return resultado(400, { mensaje: 'Poné un nombre al reporte (hasta 80 caracteres).' });
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    if (descripcion.length > 300) return resultado(400, { mensaje: 'La descripción puede tener hasta 300 caracteres.' });
    const compartidoCon = body.compartidoCon ?? [];
    if (!Array.isArray(compartidoCon) || compartidoCon.some((rol) => !ROLES[rol])) {
      return resultado(400, { mensaje: 'Solo se puede compartir con administradores o coordinadores.' });
    }

    const validada = validarDefinicion(body.definicion, usuario.rolId);
    if (validada.error) return validada.error;
    // Si se comparte con otro rol, ese rol tiene que poder ver todas las columnas que usa el reporte.
    for (const rol of new Set(compartidoCon)) {
      const permitidas = new Set(columnasPermitidas(validada.fuente, rol).map((columna) => columna.campo));
      const ocultas = [...camposUsados(validada.definicion)].filter((campo) => !permitidas.has(campo));
      if (!validada.fuente.roles.includes(rol) || ocultas.length) {
        const etiquetas = ocultas.map((campo) => validada.disponibles.get(campo)?.etiqueta || campo).join(', ');
        return resultado(400, {
          mensaje: `Para compartirlo con ${ROLES[rol]}, quitá lo que ellos no pueden ver${etiquetas ? `: ${etiquetas}` : ''}.`,
        });
      }
    }
    const datos = {
      nombre, descripcion, definicion: validada.definicion, compartidoCon: [...new Set(compartidoCon)],
    };

    if (idParametro === null) {
      const creado = await reportesRepository.crear({ ...datos, creadoPor: usuario.id });
      return resultado(201, describirGuardado(creado, usuario, new Map()));
    }
    const existente = aId(idParametro) && await reportesRepository.buscarPorId(aId(idParametro));
    if (!existente || !puedeVer(existente, usuario)) return resultado(404, { mensaje: 'Reporte no encontrado' });
    if (existente.creadoPor !== usuario.id && usuario.rolId !== 1) {
      return resultado(403, { mensaje: 'Solo quien creó el reporte o un administrador puede modificarlo.' });
    }
    const actualizado = await reportesRepository.actualizar(existente.id, datos);
    const autores = await nombresDeAutores([actualizado], usuario);
    return resultado(200, describirGuardado(actualizado, usuario, autores));
  },

  async eliminar(idParametro, usuario) {
    const reporte = aId(idParametro) && await reportesRepository.buscarPorId(aId(idParametro));
    if (!reporte || !puedeVer(reporte, usuario)) return resultado(404, { mensaje: 'Reporte no encontrado' });
    if (reporte.creadoPor !== usuario.id && usuario.rolId !== 1) {
      return resultado(403, { mensaje: 'Solo quien creó el reporte o un administrador puede eliminarlo.' });
    }
    await reportesRepository.eliminar(reporte.id);
    return resultado(200, { mensaje: 'Reporte eliminado' });
  },
};
