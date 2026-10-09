export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  TECNICO: 'Tecnico',
});

export const ROLES_DISPONIBLES = Object.freeze([
  Object.freeze({
    id: 1,
    nombre: ROLES.ADMIN,
    permisos: [],
  }),
  Object.freeze({
    id: 2,
    nombre: ROLES.COORDINADOR,
    permisos: [],
  }),
  Object.freeze({
    id: 3,
    nombre: ROLES.TECNICO,
    permisos: [],
  }),
]);

export function buscarRol(valor) {
  return ROLES_DISPONIBLES.find((rol) => (
    rol.id === valor || rol.nombre === valor
  )) ?? null;
}
