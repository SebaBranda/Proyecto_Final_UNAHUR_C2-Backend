import { reclamosRepository } from '../../../repositories/reclamos.repository.js';
import { clientesRepository } from '../../../repositories/clientes.repository.js';
import { usuariosRepository } from '../../../repositories/usuarios.repository.js';
import { horasEntre } from '../fechas.js';

const PENDIENTES = new Set(['Abierto', 'Asignado', 'En progreso', 'Bloqueado']);

export const fuenteReclamos = {
  clave: 'reclamos',
  etiqueta: 'Reclamos',
  descripcion: 'Cada reclamo con su cliente, técnico, estado y tiempos.',
  sustantivo: { singular: 'reclamo', plural: 'reclamos' },
  roles: [1, 2],
  columnas: [
    { campo: 'id', etiqueta: 'N.º', tipo: 'numero' },
    { campo: 'tipo', etiqueta: 'Tipo', tipo: 'lista' },
    { campo: 'prioridad', etiqueta: 'Prioridad', tipo: 'lista', opciones: ['Normal', 'Alta', 'Urgente'] },
    { campo: 'estado', etiqueta: 'Estado', tipo: 'lista', opciones: ['Abierto', 'Asignado', 'En progreso', 'Bloqueado', 'Finalizado'] },
    { campo: 'cliente', etiqueta: 'Cliente', tipo: 'texto' },
    { campo: 'tecnico', etiqueta: 'Técnico', tipo: 'lista' },
    { campo: 'zona', etiqueta: 'Zona', tipo: 'lista' },
    { campo: 'creadoEn', etiqueta: 'Creado', tipo: 'fecha' },
    { campo: 'fechaProgramada', etiqueta: 'Visita programada', tipo: 'dia' },
    { campo: 'finalizadoEn', etiqueta: 'Finalizado', tipo: 'fecha' },
    { campo: 'horasResolucion', etiqueta: 'Horas de resolución', tipo: 'numero' },
    { campo: 'motivoBloqueo', etiqueta: 'Motivo del bloqueo', tipo: 'texto' },
    { campo: 'comentarioFinalizacion', etiqueta: 'Trabajo realizado', tipo: 'texto' },
    { campo: 'notasCoordinador', etiqueta: 'Notas del coordinador', tipo: 'texto' },
  ],
  columnasPorDefecto: ['id', 'tipo', 'prioridad', 'estado', 'cliente', 'tecnico', 'creadoEn'],
  ordenPorDefecto: { campo: 'creadoEn', sentido: 'desc' },
  // Filtros que la pantalla de resultado muestra a mano (período y listas desplegables).
  columnaPeriodo: 'creadoEn',
  filtrosRapidos: ['estado', 'prioridad', 'tecnico'],

  async filas() {
    const [reclamos, clientes, tecnicos] = await Promise.all([
      reclamosRepository.listar(),
      clientesRepository.listar(),
      usuariosRepository.listar({ rolId: 3 }),
    ]);
    const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente]));
    const nombresTecnicos = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]));
    return reclamos.map((reclamo) => {
      const cliente = clientesPorId.get(reclamo.clienteId);
      return {
        id: reclamo.id,
        tipo: reclamo.tipo || '',
        prioridad: reclamo.prioridad || 'Normal',
        estado: reclamo.estado || '',
        cliente: cliente?.nombre || '',
        tecnico: nombresTecnicos.get(reclamo.tecnicoId) || '',
        zona: reclamo.agrupacionGeografica || cliente?.zona || '',
        creadoEn: reclamo.creadoEn || null,
        fechaProgramada: reclamo.fechaProgramada || null,
        finalizadoEn: reclamo.finalizadoEn || null,
        horasResolucion: reclamo.estado === 'Finalizado' ? horasEntre(reclamo.creadoEn, reclamo.finalizadoEn) : null,
        motivoBloqueo: reclamo.motivoBloqueo || '',
        comentarioFinalizacion: reclamo.comentarioFinalizacion || '',
        notasCoordinador: reclamo.notasCoordinador || '',
      };
    });
  },

  indicadores(filas) {
    const finalizados = filas.filter((fila) => fila.estado === 'Finalizado' && fila.horasResolucion != null);
    const promedio = finalizados.length
      ? finalizados.reduce((suma, fila) => suma + fila.horasResolucion, 0) / finalizados.length
      : null;
    return [
      { etiqueta: 'Reclamos', valor: filas.length },
      { etiqueta: 'Urgentes sin terminar', valor: filas.filter((fila) => fila.prioridad === 'Urgente' && PENDIENTES.has(fila.estado)).length },
      { etiqueta: 'Finalizados', valor: filas.filter((fila) => fila.estado === 'Finalizado').length },
      { etiqueta: 'Horas promedio de resolución', valor: promedio, tipo: 'numero' },
    ];
  },
};
