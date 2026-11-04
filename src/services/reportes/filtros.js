import { sinAcentos } from '../../utils/paginacion.js';
import {
  aFecha, esDiaValido, finDelDia, rangoRelativo,
} from './fechas.js';

// Operadores que admite cada tipo de columna. Los textos que ve el usuario los pone la web.
const OPERADORES = {
  texto: ['contiene', 'esIgualA', 'estaVacio'],
  lista: ['esUnoDe', 'noEsNingunoDe', 'estaVacio'],
  numero: ['igual', 'mayor', 'menor', 'entre'],
  fecha: ['hoy', 'ultimosDias', 'esteMes', 'mesAnterior', 'esteAnio', 'entre', 'antes', 'despues', 'estaVacio'],
  booleano: ['esSi', 'esNo'],
};
const PERIODOS = new Set(['hoy', 'ultimosDias', 'esteMes', 'mesAnterior', 'esteAnio']);
const MAXIMO_FILTROS = 20;

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const esNumero = (valor) => valor !== null && valor !== '' && typeof valor !== 'boolean' && Number.isFinite(Number(valor));
const esTextoUtil = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const familia = (tipo) => (tipo === 'dia' ? 'fecha' : tipo);
const normalizar = (valor) => sinAcentos(valor == null ? '' : String(valor)).toLowerCase().trim();

export const operadoresDe = (tipo) => OPERADORES[familia(tipo)] || [];

// Devuelve un mensaje si el filtro no es válido para esa columna, o null.
export function validarFiltro(filtro, columna) {
  if (!esObjeto(filtro)) return 'Hay un filtro incompleto.';
  if (!columna) return `No se puede filtrar por "${filtro.campo}".`;
  const { operador, valor } = filtro;
  if (!operadoresDe(columna.tipo).includes(operador)) return `El filtro de "${columna.etiqueta}" no es válido.`;
  const incompleto = `Completá el valor del filtro "${columna.etiqueta}".`;
  if (['esUnoDe', 'noEsNingunoDe'].includes(operador)) {
    return Array.isArray(valor) && valor.length && valor.every((item) => ['string', 'number'].includes(typeof item))
      ? null : incompleto;
  }
  if (['contiene', 'esIgualA'].includes(operador)) return esTextoUtil(valor) ? null : incompleto;
  if (['igual', 'mayor', 'menor'].includes(operador)) return esNumero(valor) ? null : incompleto;
  if (operador === 'ultimosDias') {
    return Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= 3650
      ? null : 'La cantidad de días debe ser un número entre 1 y 3650.';
  }
  if (['antes', 'despues'].includes(operador)) return esDiaValido(valor) ? null : incompleto;
  if (operador === 'entre') {
    if (!Array.isArray(valor) || valor.length !== 2) return incompleto;
    const validos = familia(columna.tipo) === 'fecha' ? valor.every(esDiaValido) : valor.every(esNumero);
    if (!validos) return incompleto;
    const [desde, hasta] = familia(columna.tipo) === 'fecha' ? valor.map(aFecha) : valor.map(Number);
    return desde <= hasta ? null : `En "${columna.etiqueta}", el primer valor tiene que ser menor o igual al segundo.`;
  }
  return null;
}

export const validarCantidadDeFiltros = (filtros) => (
  filtros.length > MAXIMO_FILTROS ? `Podés usar hasta ${MAXIMO_FILTROS} filtros.` : null
);

// ¿El valor de una fila cumple el filtro? (El filtro ya fue validado.)
export function cumple(valor, filtro, tipo) {
  const { operador } = filtro;
  const vacio = valor == null || String(valor).trim() === '';
  if (operador === 'estaVacio') return vacio;
  if (operador === 'esSi') return valor === true;
  if (operador === 'esNo') return valor !== true;
  if (operador === 'contiene') return normalizar(valor).includes(normalizar(filtro.valor));
  if (operador === 'esIgualA') return normalizar(valor) === normalizar(filtro.valor);
  if (operador === 'esUnoDe') return filtro.valor.map(normalizar).includes(normalizar(valor));
  if (operador === 'noEsNingunoDe') return !filtro.valor.map(normalizar).includes(normalizar(valor));
  if (vacio) return false;

  if (familia(tipo) === 'numero') {
    const numero = Number(valor);
    if (operador === 'igual') return numero === Number(filtro.valor);
    if (operador === 'mayor') return numero > Number(filtro.valor);
    if (operador === 'menor') return numero < Number(filtro.valor);
    if (operador === 'entre') return numero >= Number(filtro.valor[0]) && numero <= Number(filtro.valor[1]);
    return false;
  }

  const fecha = aFecha(valor);
  if (!fecha) return false;
  if (PERIODOS.has(operador)) {
    const [desde, hasta] = rangoRelativo(operador, filtro.valor);
    return fecha >= desde && fecha < hasta;
  }
  if (operador === 'entre') return fecha >= aFecha(filtro.valor[0]) && fecha < finDelDia(filtro.valor[1]);
  if (operador === 'antes') return fecha < aFecha(filtro.valor);
  if (operador === 'despues') return fecha >= finDelDia(filtro.valor);
  return false;
}

// Texto para la búsqueda rápida (sin acentos ni mayúsculas).
export const textoBuscable = normalizar;
