export class ClientesMemoryRepository {
  constructor(clientesIniciales) {
    this.clientes = clientesIniciales.map((cliente) => ({ ...cliente }));
    this.siguienteId = Math.max(0, ...this.clientes.map((cliente) => cliente.id)) + 1;
  }

  async listar() {
    return this.clientes.map((cliente) => ({ ...cliente }));
  }

  async buscarPorId(id) {
    const cliente = this.clientes.find((registro) => registro.id === id);
    return cliente ? { ...cliente } : null;
  }

  async crear(datos) {
    const cliente = { ...datos, id: this.siguienteId++ };
    this.clientes.push(cliente);
    return { ...cliente };
  }

  async actualizar(id, cambios) {
    const indice = this.clientes.findIndex((cliente) => cliente.id === id);
    if (indice === -1) return null;

    const actualizado = { ...this.clientes[indice], ...cambios, id };
    this.clientes[indice] = actualizado;
    return { ...actualizado };
  }

  async eliminar(id) {
    const indice = this.clientes.findIndex((cliente) => cliente.id === id);
    if (indice === -1) return null;
    const [eliminado] = this.clientes.splice(indice, 1);
    return { ...eliminado };
  }
}
