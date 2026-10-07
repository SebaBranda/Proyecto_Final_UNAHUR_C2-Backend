export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  TECNICO: 'Tecnico',
});

export const ROLES_DISPONIBLES = Object.freeze([
  Object.freeze({
    id: 1,
    nombre: ROLES.ADMIN,
    permisos: ['usuarios:*', 'tecnicos:*', 'clientes:*', 'roles:leer'],
  }),
  Object.freeze({
    id: 2,
    nombre: ROLES.COORDINADOR,
    permisos: ['tecnicos:leer', 'tecnicos:crear', 'tecnicos:actualizar', 'tecnicos:eliminar',
      'clientes:leer', 'clientes:crear', 'clientes:actualizar', 'clientes:eliminar'],
  }),
  Object.freeze({
    id: 3,
    nombre: ROLES.TECNICO,
    permisos: ['tecnicos:leer', 'clientes:leer'],
  }),
]);

export function buscarRol(valor) {
  return ROLES_DISPONIBLES.find((rol) => (
    rol.id === valor || rol.nombre === valor
  )) ?? null;
}
