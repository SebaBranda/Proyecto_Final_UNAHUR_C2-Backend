export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 100;

export function obtenerPaginacion(query = {}) {
  const pagina = Math.max(1, Number.parseInt(query.pagina ?? query.page ?? '1', 10) || 1);
  const limite = Math.min(
    LIMITE_MAXIMO,
    Math.max(1, Number.parseInt(query.limite ?? query.limit ?? String(LIMITE_POR_DEFECTO), 10) || LIMITE_POR_DEFECTO),
  );
  return { pagina, limite, salto: (pagina - 1) * limite };
}

export function respuestaPaginada(datos, total, { pagina, limite }, extra = {}) {
  return {
    datos,
    paginacion: {
      pagina,
      limite,
      total,
      paginas: Math.ceil(total / limite),
      tieneAnterior: pagina > 1,
      tieneSiguiente: pagina * limite < total,
    },
    ...extra,
  };
}

// Pagina una lista que ya está en memoria (por ejemplo, cuando hay que filtrar por un dato calculado).
export function paginarEnMemoria(lista, paginacion) {
  return {
    datos: lista.slice(paginacion.salto, paginacion.salto + paginacion.limite),
    total: lista.length,
  };
}

// Texto de búsqueda limpio ('' si no hay).
export const textoDeBusqueda = (valor) => (typeof valor === 'string' ? valor.trim().slice(0, 100) : '');

const variantes = { a: 'aáà', e: 'eéè', i: 'iíì', o: 'oóò', u: 'uúùü', n: 'nñ' };

// Expresión regular para buscar "contiene" sin distinguir mayúsculas ni acentos:
// "lucia" encuentra "Lucía" y "LUCIA".
export function regexDeBusqueda(texto) {
  const patron = texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[aeioun]/g, (letra) => `[${variantes[letra]}]`);
  return new RegExp(patron, 'i');
}

// Para comparar textos en memoria con la misma regla (sin mayúsculas ni acentos).
export const sinAcentos = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
