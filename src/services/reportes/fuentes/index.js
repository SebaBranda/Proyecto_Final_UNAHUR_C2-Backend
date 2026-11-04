import { fuenteReclamos } from './reclamos.js';
import { fuenteClientes } from './clientes.js';
import { fuenteTecnicos } from './tecnicos.js';
import { fuenteVehiculos } from './vehiculos.js';
import { fuenteJornadas } from './jornadas.js';
import { fuenteControles } from './controles.js';

// Cada fuente de datos de los reportes vive en su propio archivo: qué columnas tiene (y quién
// puede ver cada una), cómo arma sus filas y qué indicadores muestra.
export const FUENTES = Object.fromEntries(
  [fuenteReclamos, fuenteClientes, fuenteTecnicos, fuenteVehiculos, fuenteJornadas, fuenteControles]
    .map((fuente) => [fuente.clave, fuente]),
);

// Columnas que puede ver un rol (las que no tienen "roles" las ven todos los que usan la fuente).
export const columnasPermitidas = (fuente, rolId) => fuente.columnas
  .filter((columna) => !columna.roles || columna.roles.includes(rolId));
