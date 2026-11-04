import { usuariosRepository } from '../../../repositories/usuarios.repository.js';
import { reclamosRepository } from '../../../repositories/reclamos.repository.js';
import { jornadasRepository } from '../../../repositories/jornadas.repository.js';
import { vehiculosRepository } from '../../../repositories/vehiculos.repository.js';

const PENDIENTES = new Set(['Asignado', 'En progreso']);

export const fuenteTecnicos = {
  clave: 'tecnicos',
  etiqueta: 'Técnicos',
  descripcion: 'Cada técnico con su vehículo, su jornada y sus reclamos.',
  sustantivo: { singular: 'técnico', plural: 'técnicos' },
  roles: [1, 2],
  // Documento y fecha de nacimiento son datos personales: solo los ve el administrador.
  columnas: [
    { campo: 'id', etiqueta: 'N.º', tipo: 'numero' },
    { campo: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
    { campo: 'usuario', etiqueta: 'Usuario', tipo: 'texto' },
    { campo: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
    { campo: 'activo', etiqueta: 'Habilitado', tipo: 'booleano' },
    { campo: 'vehiculo', etiqueta: 'Vehículo', tipo: 'texto' },
    { campo: 'jornadaActiva', etiqueta: 'Trabajando ahora', tipo: 'booleano' },
    { campo: 'reclamosPendientes', etiqueta: 'Reclamos pendientes', tipo: 'numero' },
    { campo: 'reclamosFinalizados', etiqueta: 'Reclamos finalizados', tipo: 'numero' },
    { campo: 'documento', etiqueta: 'Documento', tipo: 'texto', roles: [1] },
    { campo: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'dia', roles: [1] },
  ],
  columnasPorDefecto: ['nombre', 'activo', 'vehiculo', 'jornadaActiva', 'reclamosPendientes', 'reclamosFinalizados'],
  ordenPorDefecto: { campo: 'nombre', sentido: 'asc' },
  columnaPeriodo: null,
  filtrosRapidos: [],

  async filas() {
    const [tecnicos, reclamos, jornadasActivas, vehiculos] = await Promise.all([
      usuariosRepository.listar({ rolId: 3 }),
      reclamosRepository.listar({ tecnicoId: { $ne: null } }),
      jornadasRepository.listar({ activa: true }),
      vehiculosRepository.listar({ tecnicoAsignado: { $ne: null } }),
    ]);
    return tecnicos.map((tecnico) => {
      const propios = reclamos.filter((reclamo) => reclamo.tecnicoId === tecnico.id);
      return {
        id: tecnico.id,
        nombre: tecnico.nombre || '',
        usuario: tecnico.usuario || '',
        telefono: tecnico.perfil?.telefono || '',
        activo: tecnico.activo !== false,
        vehiculo: vehiculos.find((vehiculo) => vehiculo.tecnicoAsignado === tecnico.id)?.patente || '',
        jornadaActiva: jornadasActivas.some((jornada) => jornada.tecnicoId === tecnico.id),
        reclamosPendientes: propios.filter((reclamo) => PENDIENTES.has(reclamo.estado)).length,
        reclamosFinalizados: propios.filter((reclamo) => reclamo.estado === 'Finalizado').length,
        documento: tecnico.perfil?.documento || '',
        fechaNacimiento: tecnico.perfil?.fechaNacimiento || null,
      };
    });
  },

  indicadores(filas) {
    return [
      { etiqueta: 'Técnicos', valor: filas.length },
      { etiqueta: 'Trabajando ahora', valor: filas.filter((fila) => fila.jornadaActiva).length },
      { etiqueta: 'Reclamos pendientes', valor: filas.reduce((suma, fila) => suma + fila.reclamosPendientes, 0) },
    ];
  },
};
