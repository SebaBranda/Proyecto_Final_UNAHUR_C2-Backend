import { clientesRepository } from '../../../repositories/clientes.repository.js';
import { reclamosRepository } from '../../../repositories/reclamos.repository.js';

export const fuenteClientes = {
  clave: 'clientes',
  etiqueta: 'Clientes',
  descripcion: 'Cada cliente con sus datos de contacto y sus reclamos.',
  sustantivo: { singular: 'cliente', plural: 'clientes' },
  roles: [1, 2],
  // Documento y email son datos personales: solo los ve el administrador.
  columnas: [
    { campo: 'id', etiqueta: 'N.º', tipo: 'numero' },
    { campo: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
    { campo: 'documento', etiqueta: 'Documento', tipo: 'texto', roles: [1] },
    { campo: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
    { campo: 'email', etiqueta: 'Email', tipo: 'texto', roles: [1] },
    { campo: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
    { campo: 'zona', etiqueta: 'Zona', tipo: 'lista' },
    { campo: 'activo', etiqueta: 'Activo', tipo: 'booleano' },
    { campo: 'cantidadReclamos', etiqueta: 'Reclamos en total', tipo: 'numero' },
    { campo: 'reclamosAbiertos', etiqueta: 'Reclamos sin terminar', tipo: 'numero' },
  ],
  columnasPorDefecto: ['nombre', 'telefono', 'direccion', 'activo', 'cantidadReclamos', 'reclamosAbiertos'],
  ordenPorDefecto: { campo: 'nombre', sentido: 'asc' },
  columnaPeriodo: null,
  filtrosRapidos: ['zona'],

  async filas() {
    const [clientes, reclamos] = await Promise.all([clientesRepository.listar(), reclamosRepository.listar()]);
    const totales = new Map();
    reclamos.forEach((reclamo) => {
      const actual = totales.get(reclamo.clienteId) || { total: 0, abiertos: 0 };
      actual.total += 1;
      if (reclamo.estado !== 'Finalizado') actual.abiertos += 1;
      totales.set(reclamo.clienteId, actual);
    });
    return clientes.map((cliente) => ({
      id: cliente.id,
      nombre: cliente.nombre || '',
      documento: cliente.documento || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      zona: cliente.zona || '',
      activo: cliente.activo !== false,
      cantidadReclamos: totales.get(cliente.id)?.total || 0,
      reclamosAbiertos: totales.get(cliente.id)?.abiertos || 0,
    }));
  },

  indicadores(filas) {
    return [
      { etiqueta: 'Clientes', valor: filas.length },
      { etiqueta: 'Activos', valor: filas.filter((fila) => fila.activo).length },
      { etiqueta: 'Con reclamos sin terminar', valor: filas.filter((fila) => fila.reclamosAbiertos > 0).length },
    ];
  },
};
