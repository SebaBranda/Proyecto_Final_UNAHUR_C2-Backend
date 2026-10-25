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

export function respuestaPaginada(datos, total, { pagina, limite }) {
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
  };
}
