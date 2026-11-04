import { vehiculosRepository } from '../../../repositories/vehiculos.repository.js';
import { usuariosRepository } from '../../../repositories/usuarios.repository.js';
import { diasHasta } from '../fechas.js';

export const fuenteVehiculos = {
  clave: 'vehiculos',
  etiqueta: 'Vehículos',
  descripcion: 'La flota: técnico asignado, kilometraje, seguro y service.',
  sustantivo: { singular: 'vehículo', plural: 'vehículos' },
  roles: [1, 2],
  columnas: [
    { campo: 'patente', etiqueta: 'Patente', tipo: 'texto' },
    { campo: 'marca', etiqueta: 'Marca', tipo: 'lista' },
    { campo: 'modelo', etiqueta: 'Modelo', tipo: 'texto' },
    { campo: 'tecnicoAsignado', etiqueta: 'Técnico asignado', tipo: 'lista' },
    { campo: 'enServicio', etiqueta: 'En servicio', tipo: 'booleano' },
    { campo: 'kilometrajeActual', etiqueta: 'Kilometraje', tipo: 'numero' },
    { campo: 'companiaSeguro', etiqueta: 'Compañía de seguro', tipo: 'lista' },
    { campo: 'vencimientoSeguro', etiqueta: 'Vence el seguro', tipo: 'dia' },
    { campo: 'diasParaVencer', etiqueta: 'Días para que venza', tipo: 'numero' },
    { campo: 'ultimoService', etiqueta: 'Último service', tipo: 'dia' },
  ],
  columnasPorDefecto: ['patente', 'modelo', 'tecnicoAsignado', 'kilometrajeActual', 'vencimientoSeguro', 'diasParaVencer'],
  ordenPorDefecto: { campo: 'patente', sentido: 'asc' },
  columnaPeriodo: null,
  filtrosRapidos: ['tecnicoAsignado'],

  async filas() {
    const [vehiculos, tecnicos] = await Promise.all([
      vehiculosRepository.listar(),
      usuariosRepository.listar({ rolId: 3 }),
    ]);
    const nombresTecnicos = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]));
    return vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      patente: vehiculo.patente || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      tecnicoAsignado: nombresTecnicos.get(vehiculo.tecnicoAsignado) || '',
      enServicio: vehiculo.enServicio !== false,
      kilometrajeActual: vehiculo.kilometraje?.actual ?? null,
      companiaSeguro: vehiculo.seguro?.compania || '',
      vencimientoSeguro: vehiculo.seguro?.vence || null,
      diasParaVencer: diasHasta(vehiculo.seguro?.vence),
      ultimoService: vehiculo.ultimoService || null,
    }));
  },

  indicadores(filas) {
    return [
      { etiqueta: 'Vehículos', valor: filas.length },
      { etiqueta: 'Sin técnico', valor: filas.filter((fila) => !fila.tecnicoAsignado).length },
      { etiqueta: 'Seguro vencido o por vencer (30 días)', valor: filas.filter((fila) => fila.diasParaVencer != null && fila.diasParaVencer <= 30).length },
    ];
  },
};
