export class UbicacionesMemoryRepository {
  constructor() {
    this.ubicaciones = new Map();
  }

  async listar() {
    return [...this.ubicaciones.values()].map((ubicacion) => ({ ...ubicacion }));
  }

  async listarPorTecnico(tecnicoId) {
    const ubicacion = this.ubicaciones.get(tecnicoId);
    return ubicacion ? [{ ...ubicacion }] : [];
  }

  async actualizar(tecnicoId, { latitud, longitud }) {
    const ubicacion = {
      tecnicoId,
      latitud,
      longitud,
      actualizadoEn: new Date(),
    };
    this.ubicaciones.set(tecnicoId, ubicacion);
    return { ...ubicacion };
  }
}
