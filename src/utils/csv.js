// CSV para abrir con Excel en español: separador ";", UTF-8 con BOM (para los acentos) y cada
// valor entre comillas.
// Un texto que empieza con =, +, -, @ (o tabulación) Excel lo ejecuta como fórmula: se le antepone
// un apóstrofo para que se muestre como texto (por ejemplo, un cliente llamado "=HIPERVINCULO(...)").
// Las columnas numéricas no se protegen, así un "-5" sigue siendo un número.
const pareceFormula = /^[=+\-@\t\r]/;

const escapar = (valor, protegerFormulas) => {
  let texto = valor == null ? '' : String(valor);
  if (protegerFormulas && pareceFormula.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
};

// columnas: [{ campo, etiqueta, tipo }]. filas: objetos con los valores ya formateados como texto.
export function crearCsv(columnas, filas) {
  const encabezado = columnas.map((columna) => escapar(columna.etiqueta, true)).join(';');
  const contenido = filas.map((fila) => columnas
    .map((columna) => escapar(fila[columna.campo], columna.tipo !== 'numero'))
    .join(';'));
  return `﻿${[encabezado, ...contenido].join('\r\n')}`;
}
