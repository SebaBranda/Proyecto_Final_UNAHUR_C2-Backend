import { vehiculosRepository } from '../../../repositories/vehiculos.repository.js';
import { usuariosRepository } from '../../../repositories/usuarios.repository.js';

const numeroONulo = (valor) => (valor == null || valor === '' || !Number.isFinite(Number(valor)) ? null : Number(valor));

export const fuenteControles = {
  clave: 'controles',
  etiqueta: 'Controles de vehículos',
  descripcion: 'Cada control cargado: kilometraje, combustible y estado del vehículo.',
  sustantivo: { singular: 'control', plural: 'controles de vehículos' },
  roles: [1, 2],
  columnas: [
    { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { campo: 'patente', etiqueta: 'Patente', tipo: 'lista' },
    { campo: 'modelo', etiqueta: 'Modelo', tipo: 'texto' },
    { campo: 'tecnico', etiqueta: 'Cargado por', tipo: 'lista' },
    { campo: 'kilometraje', etiqueta: 'Kilometraje', tipo: 'numero' },
    { campo: 'litros', etiqueta: 'Litros', tipo: 'numero' },
    { campo: 'estado', etiqueta: 'Estado del vehículo', tipo: 'lista' },
    { campo: 'observaciones', etiqueta: 'Observaciones', tipo: 'texto' },
  ],
  columnasPorDefecto: ['fecha', 'patente', 'tecnico', 'kilometraje', 'litros', 'estado', 'observaciones'],
  ordenPorDefecto: { campo: 'fecha', sentido: 'desc' },
  columnaPeriodo: 'fecha',
  filtrosRapidos: ['patente', 'tecnico'],

  async filas() {
    const [vehiculos, usuarios] = await Promise.all([vehiculosRepository.listar(), usuariosRepository.listar()]);
    const nombres = new Map(usuarios.map((usuario) => [usuario.id, usuario.nombre]));
    return vehiculos.flatMap((vehiculo) => (vehiculo.controles || []).map((control) => ({
      // Los controles nuevos guardan fechaControl y quién los cargó (registradoPor).
      fecha: control.fechaControl || control.fecha || null,
      patente: vehiculo.patente || '',
      modelo: vehiculo.modelo || '',
      tecnico: nombres.get(control.registradoPor) || '',
      kilometraje: numeroONulo(control.kilometraje ?? control.km),
      litros: numeroONulo(control.litros),
      estado: control.estado || '',
      observaciones: control.observaciones || '',
    })));
  },

  indicadores(filas) {
    return [
      { etiqueta: 'Controles', valor: filas.length },
      { etiqueta: 'Vehículos controlados', valor: new Set(filas.map((fila) => fila.patente)).size },
      { etiqueta: 'Litros cargados', valor: filas.reduce((suma, fila) => suma + (fila.litros || 0), 0), tipo: 'numero' },
    ];
  },
};
