export const PERFILES_POR_ROL = Object.freeze({
  1: Object.freeze({
    departamento: Object.freeze({ tipo: 'string' }),
    nivelAcceso: Object.freeze({ tipo: 'string' }),
  }),
  2: Object.freeze({
    zonaAsignada: Object.freeze({ tipo: 'string' }),
    maxTecnicosACargo: Object.freeze({ tipo: 'number', minimo: 0 }),
  }),
  3: Object.freeze({
    documento: Object.freeze({ tipo: 'string' }),
    fechaNacimiento: Object.freeze({ tipo: 'date' }),
    vencimientoRegistro: Object.freeze({ tipo: 'date' }),
    telefono: Object.freeze({ tipo: 'string' }),
    email: Object.freeze({ tipo: 'string' }),
    direccion: Object.freeze({ tipo: 'string' }),
  }),
});

export const TODOS_LOS_CAMPOS_PERFIL = Object.freeze(
  [...new Set(Object.values(PERFILES_POR_ROL).flatMap(Object.keys))],
);

export function obtenerDefinicionPerfil(rolId) {
  return PERFILES_POR_ROL[rolId] ?? null;
}
