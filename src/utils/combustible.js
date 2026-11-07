export const NIVELES_COMBUSTIBLE = new Set(['1/4', '1/2', '3/4', '1']);

export function validarNivelCombustible(valor) {
  return typeof valor === 'string' && NIVELES_COMBUSTIBLE.has(valor);
}
