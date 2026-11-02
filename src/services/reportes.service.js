import {
  Cliente, Jornada, Reclamo, Reporte, TecnicoProfile, Usuario, Vehiculo,
} from '../models/schemas.js';
import { crearCsv } from '../utils/csv.js';

const ROLES_GESTION = [1, 2];
const MAX_FILAS_CSV = 10000;
const hoy = () => new Date();
const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const finDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
const fecha = (valor) => {
  const resultado = new Date(valor);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
};
const numero = (valor) => (valor == null || valor === '' ? null : Number(valor));
const texto = (valor) => (valor == null ? '' : String(valor));
const fechaEs = (valor) => {
  const resultado = fecha(valor);
  return resultado ? resultado.toLocaleString('es-AR') : '';
};

const catalogos = {
  reclamos: {
    etiqueta: 'Reclamos',
    roles: [1, 2],
    modelo: Reclamo,
    columnas: [
      ['id', 'ID', 'numero'], ['tipo', 'Tipo', 'texto'], ['prioridad', 'Prioridad', 'lista'],
      ['estado', 'Estado', 'lista'], ['cliente', 'Cliente', 'texto'], ['tecnico', 'Técnico', 'texto'],
      ['zona', 'Zona', 'texto'], ['creadoEn', 'Creado', 'fecha'], ['fechaProgramada', 'Programado', 'fecha'],
      ['finalizadoEn', 'Finalizado', 'fecha'], ['horasResolucion', 'Horas de resolución', 'numero'],
      ['motivoBloqueo', 'Motivo de bloqueo', 'texto'], ['comentarioFinalizacion', 'Comentario de finalización', 'texto'],
    ],
  },
  clientes: {
    etiqueta: 'Clientes',
    roles: [1, 2],
    columnas: [
      ['id', 'ID', 'numero'], ['nombre', 'Nombre', 'texto'], ['documento', 'Documento', 'texto', [1]],
      ['telefono', 'Teléfono', 'texto'], ['email', 'Email', 'texto', [1]], ['direccion', 'Dirección', 'texto'],
      ['activo', 'Activo', 'booleano'], ['cantidadReclamos', 'Cantidad de reclamos', 'numero'],
      ['reclamosAbiertos', 'Reclamos abiertos', 'numero'],
    ],
  },
  tecnicos: {
    etiqueta: 'Técnicos',
    roles: [1, 2],
    columnas: [
      ['id', 'ID', 'numero'], ['nombre', 'Nombre', 'texto'], ['usuario', 'Usuario', 'texto'],
      ['activo', 'Activo', 'booleano'], ['vehiculo', 'Vehículo', 'texto'], ['jornadaActiva', 'Jornada activa', 'booleano'],
      ['reclamosAsignados', 'Reclamos asignados', 'numero'], ['reclamosFinalizados', 'Reclamos finalizados', 'numero'],
      ['documento', 'Documento', 'texto', [1]], ['fechaNacimiento', 'Fecha de nacimiento', 'fecha', [1]],
    ],
  },
  vehiculos: {
    etiqueta: 'Vehículos',
    roles: [1, 2],
    columnas: [
      ['patente', 'Patente', 'texto'], ['modelo', 'Modelo', 'texto'], ['tecnicoAsignado', 'Técnico asignado', 'texto'],
      ['kilometrajeActual', 'KM actual', 'numero'], ['companiaSeguro', 'Compañía de seguro', 'texto'],
      ['vencimientoSeguro', 'Vencimiento del seguro', 'fecha'], ['diasParaVencer', 'Días para vencer', 'numero'],
      ['ultimoService', 'Último service', 'fecha'],
    ],
  },
  jornadas: {
    etiqueta: 'Jornadas',
    roles: [1, 2],
    columnas: [
      ['id', 'ID', 'numero'], ['tecnico', 'Técnico', 'texto'], ['fecha', 'Fecha', 'fecha'],
      ['inicio', 'Inicio', 'fecha'], ['fin', 'Fin', 'fecha'], ['duracionHoras', 'Duración en horas', 'numero'],
      ['kmInicial', 'KM inicial', 'numero'], ['kmFinal', 'KM final', 'numero'], ['kmRecorridos', 'KM recorridos', 'numero'],
      ['conVehiculo', 'Con vehículo', 'booleano'], ['serviciosFinalizados', 'Servicios finalizados', 'numero'],
    ],
  },
  controles: {
    etiqueta: 'Controles de vehículos',
    roles: [1, 2],
    columnas: [
      ['fecha', 'Fecha', 'fecha'], ['patente', 'Patente', 'texto'], ['tecnico', 'Técnico', 'texto'],
      ['km', 'KM', 'numero'], ['litros', 'Litros', 'numero'], ['estado', 'Estado', 'lista'],
      ['observaciones', 'Observaciones', 'texto'],
    ],
  },
};

const plantillasFijas = [
  { nombre: 'Reclamos abiertos sin asignar', fuente: 'reclamos', filtros: [{ campo: 'estado', operador: 'esUnoDe', valor: ['Abierto'] }] },
  { nombre: 'Reclamos bloqueados', fuente: 'reclamos', filtros: [{ campo: 'estado', operador: 'esUnoDe', valor: ['Bloqueado'] }] },
  { nombre: 'Reclamos finalizados del mes', fuente: 'reclamos', filtros: [{ campo: 'estado', operador: 'esUnoDe', valor: ['Finalizado'] }, { campo: 'finalizadoEn', operador: 'esteMes' }] },
  { nombre: 'Reclamos por técnico (mes)', fuente: 'reclamos', filtros: [{ campo: 'creadoEn', operador: 'esteMes' }], agrupacion: { por: 'tecnico', calculo: 'cantidad' } },
  { nombre: 'Jornadas del mes', fuente: 'jornadas', filtros: [{ campo: 'fecha', operador: 'esteMes' }] },
  { nombre: 'Seguros por vencer', fuente: 'vehiculos', filtros: [{ campo: 'diasParaVencer', operador: 'menor', valor: 30 }] },
];

const columnasDe = (fuente, rolId) => catalogos[fuente].columnas
  .filter(([, , , roles]) => !roles || roles.includes(rolId))
  .map(([campo, etiqueta, tipo]) => ({ campo, etiqueta, tipo, operadores: operadoresDe(tipo) }));

function operadoresDe(tipo) {
  if (tipo === 'texto') return ['contiene', 'esIgualA', 'estaVacio'];
  if (tipo === 'lista') return ['esUnoDe', 'noEsNingunoDe'];
  if (tipo === 'fecha') return ['entre', 'antes', 'despues', 'ultimosDias', 'esteMes', 'mesAnterior', 'esteAnio'];
  if (tipo === 'numero') return ['igual', 'mayor', 'menor', 'entre'];
  if (tipo === 'booleano') return ['esSi', 'esNo'];
  return [];
}

function respuesta(status, body) { return { status, body }; }

function validarDefinicion(definicion, rolId) {
  if (!definicion || !catalogos[definicion.fuente]) return 'La fuente de datos no es válida';
  const catalogo = catalogos[definicion.fuente];
  if (!catalogo.roles.includes(rolId)) return 'No tienes permiso para usar esta fuente';
  const disponibles = new Map(columnasDe(definicion.fuente, rolId).map((columna) => [columna.campo, columna]));
  if (!Array.isArray(definicion.columnas) || !definicion.columnas.length) return 'Debe seleccionar al menos una columna';
  for (const campo of definicion.columnas) if (!disponibles.has(campo)) return `La columna "${campo}" no está disponible`;
  for (const filtro of definicion.filtros || []) {
    const columna = disponibles.get(filtro.campo);
    if (!columna || !columna.operadores.includes(filtro.operador)) return `El filtro "${filtro.campo}" no es válido`;
    if (['esUnoDe', 'noEsNingunoDe'].includes(filtro.operador) && !Array.isArray(filtro.valor)) return 'El valor debe ser una lista';
    if (filtro.operador === 'ultimosDias' && (!Number.isInteger(Number(filtro.valor)) || Number(filtro.valor) < 0)) return 'Los días deben ser un número válido';
  }
  if (definicion.orden && !disponibles.has(definicion.orden.campo)) return 'La columna de orden no es válida';
  if (definicion.agrupacion) {
    if (!disponibles.has(definicion.agrupacion.por)) return 'La agrupación no es válida';
    if (!['cantidad', 'suma', 'promedio'].includes(definicion.agrupacion.calculo)) return 'El cálculo de agrupación no es válido';
    if (definicion.agrupacion.calculo !== 'cantidad' && (!disponibles.has(definicion.agrupacion.campo) || disponibles.get(definicion.agrupacion.campo).tipo !== 'numero')) return 'La columna de cálculo debe ser numérica';
  }
  return null;
}

function valorDe(fila, campo) {
  const valor = fila[campo];
  return valor instanceof Date ? valor : valor;
}

function coincide(valor, filtro) {
  const operador = filtro.operador;
  if (operador === 'estaVacio') return valor == null || texto(valor).trim() === '';
  if (operador === 'esSi') return valor === true;
  if (operador === 'esNo') return valor !== true;
  if (operador === 'contiene') return texto(valor).toLocaleLowerCase().includes(texto(filtro.valor).toLocaleLowerCase());
  if (operador === 'esIgualA') return texto(valor).toLocaleLowerCase() === texto(filtro.valor).toLocaleLowerCase();
  if (operador === 'esUnoDe') return filtro.valor.map(texto).includes(texto(valor));
  if (operador === 'noEsNingunoDe') return !filtro.valor.map(texto).includes(texto(valor));
  if (['igual', 'mayor', 'menor'].includes(operador)) {
    const izquierda = numero(valor); const derecha = numero(filtro.valor);
    return izquierda != null && derecha != null && (operador === 'igual' ? izquierda === derecha : operador === 'mayor' ? izquierda > derecha : izquierda < derecha);
  }
  if (operador === 'entre') {
    if (Array.isArray(filtro.valor) && filtro.valor.length === 2) {
      const izquierda = fecha(valor) || numero(valor); const desde = fecha(filtro.valor[0]) || numero(filtro.valor[0]); const hasta = fecha(filtro.valor[1]) || numero(filtro.valor[1]);
      return izquierda != null && desde != null && hasta != null && izquierda >= desde && izquierda <= hasta;
    }
    return false;
  }
  const valorFecha = fecha(valor);
  if (!valorFecha) return false;
  const ahora = hoy();
  if (operador === 'ultimosDias') return valorFecha >= new Date(ahora.getTime() - Number(filtro.valor) * 86400000) && valorFecha <= ahora;
  if (operador === 'esteMes') return valorFecha.getFullYear() === ahora.getFullYear() && valorFecha.getMonth() === ahora.getMonth();
  if (operador === 'mesAnterior') { const mes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1); return valorFecha >= mes && valorFecha < new Date(ahora.getFullYear(), ahora.getMonth(), 1); }
  if (operador === 'esteAnio') return valorFecha.getFullYear() === ahora.getFullYear();
  if (operador === 'antes') return valorFecha < fecha(filtro.valor);
  if (operador === 'despues') return valorFecha > fecha(filtro.valor);
  return false;
}

async function datosDeFuente(fuente) {
  if (fuente === 'reclamos') {
    const [reclamos, clientes, tecnicos] = await Promise.all([
      Reclamo.find({}).select('-_id -__v').lean(), Cliente.find({}).lean(), Usuario.find({ rolId: 3 }).lean(),
    ]);
    const clientesMap = new Map(clientes.map((item) => [item.id, item]));
    const tecnicosMap = new Map(tecnicos.map((item) => [item.id, item]));
    return reclamos.map((item) => {
      const cliente = clientesMap.get(item.clienteId); const tecnico = tecnicosMap.get(item.tecnicoId);
      const finalizado = fecha(item.finalizadoEn); const creado = fecha(item.creadoEn);
      return { ...item, cliente: cliente?.nombre || '', zona: item.agrupacionGeografica || cliente?.zona || '', tecnico: tecnico?.nombre || '', horasResolucion: finalizado && creado ? (finalizado - creado) / 3600000 : null };
    });
  }
  if (fuente === 'clientes') {
    const [clientes, reclamos] = await Promise.all([
      Cliente.find({}).select('-_id -__v').lean(), Reclamo.find({}).select('clienteId estado').lean(),
    ]);
    return clientes.map((cliente) => {
      const propios = reclamos.filter((reclamo) => reclamo.clienteId === cliente.id);
      return { ...cliente, cantidadReclamos: propios.length, reclamosAbiertos: propios.filter((reclamo) => reclamo.estado !== 'Finalizado').length };
    });
  }
  if (fuente === 'tecnicos') {
    const [tecnicos, perfiles, reclamos, jornadas, vehiculos] = await Promise.all([
      Usuario.find({ rolId: 3 }).select('-_id -__v -passwordHash +nombre').lean(),
      TecnicoProfile.find({}).select('-_id -__v').lean(), Reclamo.find({}).select('tecnicoId estado').lean(),
      Jornada.find({}).select('tecnicoId activa').lean(), Vehiculo.find({}).select('tecnicoAsignado patente').lean(),
    ]);
    const perfilesMap = new Map(perfiles.map((perfil) => [perfil.usuarioId, perfil]));
    return tecnicos.map((tecnico) => {
      const propios = reclamos.filter((reclamo) => reclamo.tecnicoId === tecnico.id);
      const jornada = jornadas.find((item) => item.tecnicoId === tecnico.id && item.activa);
      const vehiculo = vehiculos.find((item) => item.tecnicoAsignado === tecnico.id);
      return { ...tecnico, ...perfilesMap.get(tecnico.id), vehiculo: vehiculo?.patente || '', jornadaActiva: Boolean(jornada), reclamosAsignados: propios.filter((reclamo) => reclamo.estado !== 'Finalizado').length, reclamosFinalizados: propios.filter((reclamo) => reclamo.estado === 'Finalizado').length };
    });
  }
  if (fuente === 'vehiculos') {
    const [vehiculos, tecnicos] = await Promise.all([
      Vehiculo.find({}).select('-_id -__v').lean(), Usuario.find({ rolId: 3 }).select('id +nombre').lean(),
    ]);
    const tecnicosMap = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]));
    return vehiculos.map((vehiculo) => ({ ...vehiculo, tecnicoAsignado: tecnicosMap.get(vehiculo.tecnicoAsignado) || '' }));
  }
  if (fuente === 'jornadas') {
    const [jornadas, tecnicos, reclamos] = await Promise.all([
      Jornada.find({}).select('-_id -__v').lean(), Usuario.find({ rolId: 3 }).select('id +nombre').lean(), Reclamo.find({}).select('jornadaId estado').lean(),
    ]);
    const tecnicosMap = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]));
    return jornadas.map((jornada) => ({ ...jornada, tecnico: tecnicosMap.get(jornada.tecnicoId) || '', serviciosFinalizados: reclamos.filter((reclamo) => reclamo.jornadaId === jornada.id && reclamo.estado === 'Finalizado').length }));
  }
  const vehiculos = await Vehiculo.find({}).select('-_id -__v').lean();
  return vehiculos.flatMap((vehiculo) => (vehiculo.controles || []).map((control) => ({ ...control, patente: vehiculo.patente })));
}

function enriquecer(fuente, filas) {
  const ahora = hoy();
  return filas.map((fila) => {
    const tecnico = fila.tecnico || fila.tecnicoAsignado;
    if (fuente === 'vehiculos') {
      const vencimiento = fecha(fila.seguro?.vence || fila.vencimientoSeguro);
      return { ...fila, modelo: fila.modelo || [fila.marca, fila.modelo].filter(Boolean).join(' '), tecnicoAsignado: tecnico || '', kilometrajeActual: fila.kilometraje?.actual ?? fila.kilometrajeActual, companiaSeguro: fila.seguro?.compania || fila.companiaSeguro, vencimientoSeguro: vencimiento, diasParaVencer: vencimiento ? Math.ceil((vencimiento - ahora) / 86400000) : null, ultimoService: fecha(fila.ultimoService) };
    }
    if (fuente === 'jornadas') {
      const inicio = fecha(fila.inicio); const fin = fecha(fila.fin);
      return { ...fila, fecha: inicio, duracionHoras: inicio && fin ? (fin - inicio) / 3600000 : null, kmInicial: fila.controlInicial?.kilometraje ?? fila.kmInicial, kmFinal: fila.controlFinal?.kilometraje ?? fila.kmFinal, kmRecorridos: (fila.controlFinal?.kilometraje ?? fila.kmFinal) - (fila.controlInicial?.kilometraje ?? fila.kmInicial), conVehiculo: Boolean(fila.controlInicial?.vehiculoId || fila.vehiculoId) };
    }
    return fila;
  });
}

async function ejecutar(definicion, rolId, opciones = {}) {
  const error = validarDefinicion(definicion, rolId);
  if (error) return respuesta(error.includes('permiso') ? 403 : 400, { mensaje: error });
  const catalogo = catalogos[definicion.fuente];
  let filas = enriquecer(definicion.fuente, await datosDeFuente(definicion.fuente));
  filas = filas.filter((fila) => (definicion.filtros || []).every((filtro) => coincide(valorDe(fila, filtro.campo), filtro)));
  if (opciones.buscar) {
    const termino = texto(opciones.buscar).toLocaleLowerCase();
    filas = filas.filter((fila) => definicion.columnas.some((campo) => texto(valorDe(fila, campo)).toLocaleLowerCase().includes(termino)));
  }
  if (definicion.agrupacion) {
    const { por, calculo, campo } = definicion.agrupacion;
    const grupos = new Map();
    filas.forEach((fila) => { const clave = texto(valorDe(fila, por)) || 'Sin dato'; const grupo = grupos.get(clave) || { [por]: clave, cantidad: 0, suma: 0 }; grupo.cantidad += 1; grupo.suma += Number(valorDe(fila, campo)) || 0; grupos.set(clave, grupo); });
    filas = [...grupos.values()].map((grupo) => ({ ...grupo, resultado: calculo === 'promedio' ? (grupo.cantidad ? grupo.suma / grupo.cantidad : 0) : calculo === 'suma' ? grupo.suma : grupo.cantidad }));
  }
  const orden = definicion.orden;
  if (orden) filas.sort((a, b) => { const izquierda = valorDe(a, orden.campo); const derecha = valorDe(b, orden.campo); return (izquierda > derecha ? 1 : izquierda < derecha ? -1 : 0) * (orden.sentido === 'desc' ? -1 : 1); });
  const pagina = Math.max(1, Number(opciones.pagina) || 1); const limite = Math.min(100, Math.max(1, Number(opciones.limite) || 25));
  const total = filas.length;
  return respuesta(200, { datos: filas.slice((pagina - 1) * limite, pagina * limite), total, paginacion: { pagina, limite, total, paginas: Math.max(1, Math.ceil(total / limite)) }, columnas: columnasDe(definicion.fuente, rolId) });
}

export const reportesService = {
  fuentes: (rolId) => respuesta(200, { fuentes: Object.entries(catalogos).filter(([, catalogo]) => catalogo.roles.includes(rolId)).map(([fuente, catalogo]) => ({ fuente, etiqueta: catalogo.etiqueta, columnas: columnasDe(fuente, rolId) })) }),
  plantillas: (rolId) => respuesta(200, plantillasFijas
    .filter((plantilla) => catalogos[plantilla.fuente].roles.includes(rolId))
    .map((plantilla, id) => ({ ...plantilla, id: `plantilla-${id + 1}`, definicion: { ...plantilla, columnas: columnasDe(plantilla.fuente, rolId).map((columna) => columna.campo), orden: null } }))),
  vistaPrevia: (definicion, rolId, opciones) => ejecutar(definicion, rolId, opciones),
  async exportar(definicion, columnasVisibles, rolId, nombre = 'reporte') {
    const resultado = await ejecutar({ ...definicion, columnas: columnasVisibles?.length ? columnasVisibles : definicion.columnas }, rolId, { pagina: 1, limite: MAX_FILAS_CSV });
    if (resultado.status !== 200) return resultado;
    if (resultado.body.total > MAX_FILAS_CSV) return respuesta(400, { mensaje: 'El reporte supera las 10.000 filas; agregá filtros para exportarlo' });
    const catalogo = new Map(columnasDe(definicion.fuente, rolId).map((columna) => [columna.campo, columna]));
    const columnas = (columnasVisibles?.length ? columnasVisibles : definicion.columnas).map((campo) => catalogo.get(campo)).filter(Boolean);
    const filas = resultado.body.datos.map((fila) => Object.fromEntries(columnas.map((columna) => [columna.campo, columna.tipo === 'fecha' ? fechaEs(fila[columna.campo]) : typeof fila[columna.campo] === 'boolean' ? (fila[columna.campo] ? 'Sí' : 'No') : fila[columna.campo]])));
    return respuesta(200, { csv: crearCsv(columnas, filas), nombre: `${nombre.replace(/[^a-z0-9áéíóúüñ _-]/gi, '').trim() || 'reporte'}-${new Date().toISOString().slice(0, 10)}.csv` });
  },
  async listar(usuario) { const datos = await Reporte.find({ $or: [{ creadoPor: usuario.id }, { compartidoCon: usuario.rolId }] }).sort({ modificadoEn: -1 }).select('-_id').lean(); return respuesta(200, datos); },
  async obtener(id, usuario) { const reporte = await Reporte.findOne({ id, $or: [{ creadoPor: usuario.id }, { compartidoCon: usuario.rolId }] }).select('-_id').lean(); return reporte ? respuesta(200, reporte) : respuesta(404, { mensaje: 'Reporte no encontrado' }); },
  async guardar(body, usuario, id = null) {
    if (!body?.nombre?.trim() || !body.definicion) return respuesta(400, { mensaje: 'Nombre y definición son obligatorios' });
    const error = validarDefinicion(body.definicion, usuario.rolId); if (error) return respuesta(error.includes('permiso') ? 403 : 400, { mensaje: error });
    if (id) {
      const existente = await Reporte.findOne({ id });
      if (!existente) return respuesta(404, { mensaje: 'Reporte no encontrado' });
      if (existente.creadoPor !== usuario.id && usuario.rolId !== 1) return respuesta(403, { mensaje: 'Solo el autor o un administrador puede modificarlo' });
      const actualizado = await Reporte.findOneAndUpdate({ id }, { nombre: body.nombre.trim(), descripcion: body.descripcion || '', definicion: body.definicion, compartidoCon: Array.isArray(body.compartidoCon) ? body.compartidoCon : existente.compartidoCon, modificadoEn: new Date() }, { new: true }).select('-_id').lean();
      return respuesta(200, actualizado);
    }
    const ultimo = await Reporte.findOne().sort({ id: -1 }).select('id').lean();
    const creado = await Reporte.create({ id: (ultimo?.id || 0) + 1, nombre: body.nombre.trim(), descripcion: body.descripcion || '', definicion: body.definicion, creadoPor: usuario.id, compartidoCon: Array.isArray(body.compartidoCon) ? body.compartidoCon : [] });
    return respuesta(201, creado.toObject());
  },
  async eliminar(id, usuario) { const reporte = await Reporte.findOne({ id }); if (!reporte) return respuesta(404, { mensaje: 'Reporte no encontrado' }); if (reporte.creadoPor !== usuario.id && usuario.rolId !== 1) return respuesta(403, { mensaje: 'Solo el autor o un administrador puede eliminarlo' }); await Reporte.deleteOne({ id }); return respuesta(200, { mensaje: 'Reporte eliminado' }); },
};
