// Fechas de los reportes en la hora de Argentina (UTC-3, sin horario de verano), sin importar en
// qué zona horaria corra el servidor (en Docker, UTC). Así "este mes" o "hoy" coinciden con lo que
// ve el usuario y las fechas del CSV no salen corridas 3 horas.
const DESFASE_ARGENTINA_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/;
const dosCifras = (numero) => String(numero).padStart(2, '0');

// Instante en que empieza el día indicado en Argentina (00:00 hs). El mes va de 0 a 11 y puede
// desbordar (mes 12 = enero del año siguiente).
export const inicioDelDia = (anio, mes, dia) => new Date(Date.UTC(anio, mes, dia) + DESFASE_ARGENTINA_MS);

// Día, mes, año, hora y minuto de un instante, vistos en Argentina.
export function partesArgentina(instante) {
  const local = new Date(instante.getTime() - DESFASE_ARGENTINA_MS);
  return {
    anio: local.getUTCFullYear(),
    mes: local.getUTCMonth(),
    dia: local.getUTCDate(),
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
  };
}

// Convierte lo que guarda la base (Date, texto ISO o "AAAA-MM-DD") en un instante, o null.
// Un día sin hora ("2026-10-20", como la visita programada) se toma como las 00:00 de Argentina.
export function aFecha(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const dia = typeof valor === 'string' ? valor.match(soloDia) : null;
  if (dia) return inicioDelDia(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3]));
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export const esDiaValido = (valor) => typeof valor === 'string' && soloDia.test(valor) && aFecha(valor) !== null;

// "AAAA-MM-DD" del día en Argentina.
export function diaArgentina(instante) {
  const { anio, mes, dia } = partesArgentina(instante);
  return `${anio}-${dosCifras(mes + 1)}-${dosCifras(dia)}`;
}

// Textos para el CSV: "DD/MM/AAAA HH:mm" o, si es solo un día, "DD/MM/AAAA".
export function fechaParaCsv(valor, conHora) {
  const fecha = aFecha(valor);
  if (!fecha) return '';
  const { anio, mes, dia, hora, minuto } = partesArgentina(fecha);
  const texto = `${dosCifras(dia)}/${dosCifras(mes + 1)}/${anio}`;
  return conHora ? `${texto} ${dosCifras(hora)}:${dosCifras(minuto)}` : texto;
}

// Mes de una fecha, para agrupar: { clave: '2026-11', etiqueta: 'nov 2026' }.
export function mesDe(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return null;
  const { anio, mes } = partesArgentina(fecha);
  return { clave: `${anio}-${dosCifras(mes + 1)}`, etiqueta: `${MESES[mes]} ${anio}` };
}

// Rango [desde, hasta) de los períodos relativos, calculado en el momento de ejecutar el reporte:
// un reporte guardado como "este mes" siempre muestra el mes en curso.
export function rangoRelativo(operador, valor, ahora = new Date()) {
  const { anio, mes, dia } = partesArgentina(ahora);
  const hoy = inicioDelDia(anio, mes, dia);
  if (operador === 'hoy') return [hoy, new Date(hoy.getTime() + DIA_MS)];
  if (operador === 'ultimosDias') return [new Date(hoy.getTime() - (Number(valor) - 1) * DIA_MS), new Date(hoy.getTime() + DIA_MS)];
  if (operador === 'esteMes') return [inicioDelDia(anio, mes, 1), inicioDelDia(anio, mes + 1, 1)];
  if (operador === 'mesAnterior') return [inicioDelDia(anio, mes - 1, 1), inicioDelDia(anio, mes, 1)];
  if (operador === 'esteAnio') return [inicioDelDia(anio, 0, 1), inicioDelDia(anio + 1, 0, 1)];
  return null;
}

// Fin (exclusivo) del día indicado: el instante en que empieza el día siguiente.
export const finDelDia = (dia) => new Date(aFecha(dia).getTime() + DIA_MS);

export const horasEntre = (desde, hasta) => {
  const inicio = aFecha(desde);
  const fin = aFecha(hasta);
  return inicio && fin ? (fin - inicio) / 3600000 : null;
};

export const diasHasta = (valor, ahora = new Date()) => {
  const fecha = aFecha(valor);
  if (!fecha) return null;
  const { anio, mes, dia } = partesArgentina(ahora);
  return Math.round((fecha - inicioDelDia(anio, mes, dia)) / DIA_MS);
};
