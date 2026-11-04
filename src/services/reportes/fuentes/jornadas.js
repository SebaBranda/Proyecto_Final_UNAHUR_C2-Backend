import { jornadasRepository } from '../../../repositories/jornadas.repository.js';
import { usuariosRepository } from '../../../repositories/usuarios.repository.js';
import { reclamosRepository } from '../../../repositories/reclamos.repository.js';
import { horasEntre } from '../fechas.js';

const numeroONulo = (valor) => (valor == null || valor === '' || !Number.isFinite(Number(valor)) ? null : Number(valor));

export const fuenteJornadas = {
  clave: 'jornadas',
  etiqueta: 'Jornadas',
  descripcion: 'Cada jornada de trabajo: horas, kilómetros y servicios.',
  sustantivo: { singular: 'jornada', plural: 'jornadas' },
  roles: [1, 2],
  columnas: [
    { campo: 'id', etiqueta: 'N.º', tipo: 'numero' },
    { campo: 'tecnico', etiqueta: 'Técnico', tipo: 'lista' },
    { campo: 'fecha', etiqueta: 'Fecha', tipo: 'dia' },
    { campo: 'inicio', etiqueta: 'Inicio', tipo: 'fecha' },
    { campo: 'fin', etiqueta: 'Fin', tipo: 'fecha' },
    { campo: 'estado', etiqueta: 'Estado', tipo: 'lista', opciones: ['Activa', 'Finalizada'] },
    { campo: 'duracionHoras', etiqueta: 'Horas trabajadas', tipo: 'numero' },
    { campo: 'conVehiculo', etiqueta: 'Con vehículo', tipo: 'booleano' },
    { campo: 'kmInicial', etiqueta: 'Km al iniciar', tipo: 'numero' },
    { campo: 'kmFinal', etiqueta: 'Km al finalizar', tipo: 'numero' },
    { campo: 'kmRecorridos', etiqueta: 'Km recorridos', tipo: 'numero' },
    { campo: 'serviciosFinalizados', etiqueta: 'Servicios finalizados', tipo: 'numero' },
    { campo: 'observaciones', etiqueta: 'Observaciones del cierre', tipo: 'texto' },
  ],
  columnasPorDefecto: ['tecnico', 'fecha', 'inicio', 'fin', 'duracionHoras', 'kmRecorridos', 'serviciosFinalizados'],
  ordenPorDefecto: { campo: 'inicio', sentido: 'desc' },
  columnaPeriodo: 'fecha',
  filtrosRapidos: ['tecnico', 'estado'],

  async filas() {
    const [jornadas, tecnicos, finalizados] = await Promise.all([
      jornadasRepository.listar(),
      usuariosRepository.listar({ rolId: 3 }),
      reclamosRepository.listar({ estado: 'Finalizado', jornadaId: { $ne: null } }),
    ]);
    const nombresTecnicos = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]));
    const serviciosPorJornada = new Map();
    finalizados.forEach((reclamo) => serviciosPorJornada.set(reclamo.jornadaId, (serviciosPorJornada.get(reclamo.jornadaId) || 0) + 1));
    return jornadas.map((jornada) => {
      // Al iniciar se guarda kilometrajeInicial; al cerrar, el control final trae kilometraje
      // (o sinVehiculo si el técnico no tenía uno asignado).
      const kmInicial = numeroONulo(jornada.controlInicial?.kilometrajeInicial ?? jornada.controlInicial?.kilometraje);
      const kmFinal = numeroONulo(jornada.controlFinal?.kilometraje ?? jornada.controlFinal?.kilometrajeFinal);
      const sinVehiculo = jornada.controlFinal?.sinVehiculo === true;
      return {
        id: jornada.id,
        tecnico: nombresTecnicos.get(jornada.tecnicoId) || '',
        fecha: jornada.inicio || null,
        inicio: jornada.inicio || null,
        fin: jornada.fin || null,
        estado: jornada.activa ? 'Activa' : 'Finalizada',
        duracionHoras: jornada.activa ? null : horasEntre(jornada.inicio, jornada.fin),
        conVehiculo: !sinVehiculo && (kmInicial != null || kmFinal != null),
        kmInicial,
        kmFinal,
        kmRecorridos: kmInicial != null && kmFinal != null ? kmFinal - kmInicial : null,
        serviciosFinalizados: serviciosPorJornada.get(jornada.id) || 0,
        observaciones: jornada.controlFinal?.observaciones || '',
      };
    });
  },

  indicadores(filas) {
    const sumar = (campo) => filas.reduce((suma, fila) => suma + (fila[campo] || 0), 0);
    return [
      { etiqueta: 'Jornadas', valor: filas.length },
      { etiqueta: 'Horas trabajadas', valor: sumar('duracionHoras'), tipo: 'numero' },
      { etiqueta: 'Km recorridos', valor: sumar('kmRecorridos') },
      { etiqueta: 'Servicios finalizados', valor: sumar('serviciosFinalizados') },
    ];
  },
};
