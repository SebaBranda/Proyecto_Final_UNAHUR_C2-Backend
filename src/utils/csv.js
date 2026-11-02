const escapar = (valor) => {
  const texto = valor == null ? '' : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
};

export function crearCsv(columnas, filas) {
  const encabezado = columnas.map((columna) => escapar(columna.etiqueta)).join(';');
  const contenido = filas.map((fila) => columnas.map((columna) => escapar(fila[columna.campo])).join(';'));
  return `\uFEFF${[encabezado, ...contenido].join('\r\n')}`;
}
