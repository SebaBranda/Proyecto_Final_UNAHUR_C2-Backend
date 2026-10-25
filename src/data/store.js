export const usuariosIniciales = [
  { id: 1, usuario: 'admin', passwordHash: 'scrypt$v1$028ebe00d3363f4ea98efd8341c31f6a$a43d894a6143b0a879c8e0ca98f4d71206b276fe69c84f253bc6f9fbc2f3c96181c974f13710de832f08891f2f5532a21eeade8928078798f22daa94caf712ee', nombre: 'Ana Administradora', rolId: 1, activo: true },
  { id: 2, usuario: 'coordinador', passwordHash: 'scrypt$v1$9e77b7ac2273dbe1e2bc38aea4e0a9ce$fe109a35968e9b5fd56b64e152d76999f206779b22871ffbac2c6568daba023bef176e225f7cad0908016f397c210d94948ab898bcb3a70a9ed8a11d3f798b79', nombre: 'Carlos', rolId: 2, activo: true },
  {
    id: 3,
    usuario: 'tecnico',
    passwordHash: 'scrypt$v1$6a1926dc755419da066475cd28fa9f88$eca7da7c2a9509d794d439a7c28b5491e5f98a9b70a4491524e0b9d103015c3195f8c60429633efe225422a33aab4fcbc205208b40cb87aa3e3b2a860cb92895',
    nombre: 'Tomas',
    rolId: 3,
    activo: true,
  },
  {
    id: 4,
    usuario: 'tecnico.libre',
    passwordHash: 'scrypt$v1$79c45a97b8dd50cc0686bd8dce9f94c8$b5777ecae8a622b68d36b47114b78ab5d0bc2e0f015a8422726f7c2817ccc7c6ba55a1651d5463d893579c8d209c4ce169fb92e633b0abcf60bc4482b8ed8873',
    nombre: 'Sofia',
    rolId: 3,
    activo: true,
  },
  {
    id: 5,
    usuario: 'tecnico.moreno',
    passwordHash: 'scrypt$v1$c256fbc0894349d58bfd2afe1c34a511$715765885d19bbf07747cef413871d7e588d3cb7855175cdb5c10d1c37f10f047ece3df952b3796d6f91aed7517ced3df77669489c64e07b61d6634cd9ec0429',
    nombre: 'Martin',
    rolId: 3,
    activo: true,
  },
  {
    id: 6,
    usuario: 'tecnico.hurlingham',
    passwordHash: 'scrypt$v1$ed04e62599120c010228be1b59549a40$d75187602c6ebf05ef044f2b831e10d9135920dfeb9c3b2663f3df5fe94e2ebe4f6bb78099e7708eccf98488be40707279658176f7535425d4f935d53aea3fac',
    nombre: 'Carla',
    rolId: 3,
    activo: true,
  },
  {
    id: 7,
    usuario: 'tecnico.ramos',
    passwordHash: 'scrypt$v1$a160406a067474d4ff74c87c6440f467$77b8655ad8a55e13c92953f3101aa65369ebe2c9daa44f0bb8b18976b0ff120d13818e2dfadadfcf3065bb801fdf8f866b8690c493bf6739f606821299eff89f',
    nombre: 'Javier',
    rolId: 3,
    activo: true,
  },
  {
    id: 8,
    usuario: 'tecnico.haedo',
    passwordHash: 'scrypt$v1$4c64b66ab0b9044e7f9680280a4a2834$aa03a96089fe4bb59460ee695ecc31d4dba90d9650c4e18ce6918b903373630ab1866cd05f66e0e0e031e8f1e2235d93c0a148042ad5824605f9b51f1fe497c6',
    nombre: 'Valeria',
    rolId: 3,
    activo: true,
  },
  {
    id: 9,
    usuario: 'tecnico.ituz',
    passwordHash: 'scrypt$v1$19c051da06de43a10a09ea45730ee0ae$0954f1338343dd91180744b2819376d057d870e42ee53bfa488ad45cc6d4fa89edc45189b4f54a59ffef1b283718f5f2da80bc44ae409c5d2700b49136d638d9',
    nombre: 'Nicolas',
    rolId: 3,
    activo: true,
  },
];

export const adminPerfilesIniciales = [
  { usuarioId: 1, departamento: 'Administración', nivelAcceso: 'Total' },
];

export const coordinadorPerfilesIniciales = [
  { usuarioId: 2, zonaAsignada: 'Zona Oeste', maxTecnicosACargo: 20 },
];

export const tecnicoPerfilesIniciales = [
  {
    usuarioId: 3,
    documento: '32555111',
    fechaNacimiento: '1988-04-12',
    vencimientoRegistro: '2027-04-12',
    telefono: '11-4555-1020',
    email: 'tomas.tecnico@galactic.app',
    direccion: 'Belgrano 124, Moron',
  },
  {
    usuarioId: 4,
    documento: '33444222',
    fechaNacimiento: '1991-08-27',
    vencimientoRegistro: '2026-11-30',
    telefono: '11-4666-2030',
    email: 'sofia.tecnica@galactic.app',
    direccion: 'Alvear 845, Castelar',
  },
  {
    usuarioId: 5,
    documento: '31888999',
    fechaNacimiento: '1986-02-19',
    vencimientoRegistro: '2027-02-19',
    telefono: '11-4777-3040',
    email: 'martin.tecnico@galactic.app',
    direccion: 'Italia 562, Moreno',
  },
  {
    usuarioId: 6,
    documento: '34666777',
    fechaNacimiento: '1993-11-05',
    vencimientoRegistro: '2026-12-18',
    telefono: '11-4888-4050',
    email: 'carla.tecnica@galactic.app',
    direccion: 'Jauretche 210, Hurlingham',
  },
  {
    usuarioId: 7,
    documento: '35222111',
    fechaNacimiento: '1989-06-23',
    vencimientoRegistro: '2027-06-23',
    telefono: '11-4999-5060',
    email: 'javier.tecnico@galactic.app',
    direccion: 'Av. San Martin 930, Ramos Mejia',
  },
  {
    usuarioId: 8,
    documento: '36111222',
    fechaNacimiento: '1990-10-14',
    vencimientoRegistro: '2027-01-20',
    telefono: '11-4000-6170',
    email: 'valeria.tecnica@galactic.app',
    direccion: 'Rivadavia 15800, Haedo',
  },
  {
    usuarioId: 9,
    documento: '37444555',
    fechaNacimiento: '1995-01-31',
    vencimientoRegistro: '2027-01-31',
    telefono: '11-4111-7280',
    email: 'nicolas.tecnico@galactic.app',
    direccion: 'Brandsen 440, Ituzaingo',
  },
];

export const clientesIniciales = [
  {
    id: 1,
    nombre: 'Lucia Fernandez',
    documento: '30111222',
    telefono: '11-4567-8901',
    email: 'lucia.fernandez@galactic.app',
    direccion: 'Av. Rivadavia 1234, Moron',
    activo: true,
    coordenadas: { latitud: -34.6512, longitud: -58.6198 },
    zona: 'Moron Centro',
  },
  {
    id: 2,
    nombre: 'Diego Ramirez',
    documento: '28777888',
    telefono: '11-4988-2233',
    email: 'diego.ramirez@galactic.app',
    direccion: 'Sarmiento 845, Castelar',
    activo: true,
    coordenadas: { latitud: -34.6571, longitud: -58.6405 },
    zona: 'Castelar Norte',
  },
  {
    id: 3,
    nombre: 'Marta Gonzalez',
    documento: '29333444',
    telefono: '11-4222-3344',
    email: 'marta.gonzalez@galactic.app',
    direccion: 'Rivadavia 4567, Ramos Mejia',
    activo: true,
    coordenadas: { latitud: -34.6488, longitud: -58.5635 },
    zona: 'Ramos Mejia',
  },
  {
    id: 4,
    nombre: 'Pablo Martinez',
    documento: '27666777',
    telefono: '11-4333-4455',
    email: 'pablo.martinez@galactic.app',
    direccion: 'Juan B. Justo 1120, Haedo',
    activo: true,
    coordenadas: { latitud: -34.6445, longitud: -58.592 },
    zona: 'Haedo Centro',
  },
  {
    id: 5,
    nombre: 'Rocio Benitez',
    documento: '33999000',
    telefono: '11-4444-5566',
    email: 'rocio.benitez@galactic.app',
    direccion: 'Zufriategui 780, Ituzaingo',
    activo: true,
    coordenadas: { latitud: -34.6545, longitud: -58.672 },
    zona: 'Ituzaingo Norte',
  },
  {
    id: 6,
    nombre: 'Gustavo Acosta',
    documento: '26555444',
    telefono: '11-4555-6677',
    email: 'gustavo.acosta@galactic.app',
    direccion: 'Pedro Diaz 1500, Hurlingham',
    activo: true,
    coordenadas: { latitud: -34.589, longitud: -58.639 },
    zona: 'Hurlingham Centro',
  },
  {
    id: 7,
    nombre: 'Florencia Suarez',
    documento: '38123456',
    telefono: '11-4666-7788',
    email: 'florencia.suarez@galactic.app',
    direccion: 'Libertador 320, Moreno',
    activo: true,
    coordenadas: { latitud: -34.651, longitud: -58.79 },
    zona: 'Moreno Centro',
  },
  {
    id: 8,
    nombre: 'Hernan Paz',
    documento: '25888111',
    telefono: '11-4777-8899',
    email: 'hernan.paz@galactic.app',
    direccion: 'Arias 2100, Castelar',
    activo: true,
    coordenadas: { latitud: -34.668, longitud: -58.645 },
    zona: 'Castelar Sur',
  },
  {
    id: 9,
    nombre: 'Panaderia La Espiga',
    documento: '30712345678',
    telefono: '11-4888-9900',
    email: 'contacto@laespiga.galactic.app',
    direccion: 'Machado 950, Moron',
    activo: true,
    coordenadas: { latitud: -34.662, longitud: -58.615 },
    zona: 'Moron Sur',
  },
  {
    id: 10,
    nombre: 'Ines Duarte',
    documento: '24333222',
    telefono: '11-4999-0011',
    email: 'ines.duarte@galactic.app',
    direccion: 'Gaona 3200, Haedo',
    activo: false,
    coordenadas: { latitud: -34.638, longitud: -58.596 },
    zona: 'Haedo Norte',
  },
];

export const vehiculosIniciales = [
  { id: 1, patente: 'AB 123 CD', marca: 'Renault', modelo: 'Renault Kangoo', tecnicoAsignado: 3, kilometraje: { inicial: 45210, actual: 46840, final: null }, seguro: { compania: 'La Segunda', poliza: 'LS-45210', vence: '2027-04-30' }, ultimoService: '2026-07-18', detalle: 'Unidad utilitaria para visitas técnicas y traslado de herramientas.', disponible: true },
  { id: 2, patente: 'AC 456 EF', marca: 'Fiat', modelo: 'Fiorino', tecnicoAsignado: 4, kilometraje: { inicial: 38120, actual: 39785, final: null }, seguro: { compania: 'Sancor Seguros', poliza: 'SC-38120', vence: '2027-01-15' }, ultimoService: '2026-08-02', detalle: 'Vehículo liviano para recorridos urbanos y atención de reclamos.', disponible: true },
  { id: 3, patente: 'AD 789 GH', marca: 'Volkswagen', modelo: 'Saveiro', tecnicoAsignado: 5, kilometraje: { inicial: 52780, actual: 54120, final: null }, seguro: { compania: 'Federación Patronal', poliza: 'FP-52780', vence: '2026-12-20' }, ultimoService: '2026-06-11', detalle: 'Camioneta de apoyo para materiales y tareas en zonas alejadas.', disponible: true },
  { id: 4, patente: 'AE 321 JK', marca: 'Chevrolet', modelo: 'Montana', tecnicoAsignado: 6, kilometraje: { inicial: 29400, actual: 30210, final: null }, seguro: { compania: 'Provincia Seguros', poliza: 'PS-29400', vence: '2027-06-08' }, ultimoService: '2026-08-21', detalle: 'Unidad de apoyo para trabajos de mantenimiento y tendido.', disponible: true },
  { id: 5, patente: 'AF 654 LM', marca: 'Peugeot', modelo: 'Partner', tecnicoAsignado: 7, kilometraje: { inicial: 61200, actual: 62950, final: null }, seguro: { compania: 'Rivadavia Seguros', poliza: 'RV-61200', vence: '2027-03-10' }, ultimoService: '2026-09-05', detalle: 'Utilitario asignado a la zona de Ramos Mejia.', disponible: true },
  { id: 6, patente: 'AG 987 NP', marca: 'Toyota', modelo: 'Hilux', tecnicoAsignado: 8, kilometraje: { inicial: 18350, actual: 19820, final: null }, seguro: { compania: 'La Caja', poliza: 'LC-18350', vence: '2027-08-01' }, ultimoService: '2026-09-28', detalle: 'Camioneta para instalaciones con escalera y bobinas de fibra.', disponible: true },
  { id: 7, patente: 'AH 246 QR', marca: 'Citroen', modelo: 'Berlingo', tecnicoAsignado: 9, kilometraje: { inicial: 47010, actual: 48330, final: null }, seguro: { compania: 'Mercantil Andina', poliza: 'MA-47010', vence: '2026-11-25' }, ultimoService: '2026-07-30', detalle: 'Utilitario para recorridos en Ituzaingo y alrededores.', disponible: true },
  { id: 8, patente: 'AI 135 ST', marca: 'Ford', modelo: 'Ranger', tecnicoAsignado: null, kilometraje: { inicial: 9800, actual: 10240, final: null }, seguro: { compania: 'Allianz', poliza: 'AZ-09800', vence: '2027-09-14' }, ultimoService: '2026-09-20', detalle: 'Unidad de reserva disponible para asignar.', disponible: true },
  { id: 9, patente: 'AJ 864 UV', marca: 'Renault', modelo: 'Kangoo', tecnicoAsignado: null, kilometraje: { inicial: 88400, actual: 91275, final: null }, seguro: { compania: 'La Segunda', poliza: 'LS-88400', vence: '2027-02-02' }, ultimoService: '2026-10-10', detalle: 'En taller por cambio de embrague; sin técnico asignado.', disponible: false, enServicio: false },
];

export const reclamosIniciales = [
  { id: 1, clienteId: 1, tipo: 'Sin servicio', prioridad: 'Urgente', descripcion: 'Cliente sin conexion desde la madrugada.', estado: 'Abierto', creadoEn: '2026-09-03T08:15:00-03:00', tecnicoId: null, agrupacionGeografica: 'Moron Centro', fechaProgramada: '2026-09-03' },
  { id: 2, clienteId: 2, tipo: 'Baja potencia', prioridad: 'Normal', descripcion: 'La potencia recibida esta por debajo del valor esperado.', estado: 'Asignado', creadoEn: '2026-09-02T14:30:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Castelar Norte', fechaProgramada: '2026-09-03' },
  { id: 3, clienteId: 1, tipo: 'Corte intermitente', prioridad: 'Alta', descripcion: 'La conexion se corta durante algunos minutos varias veces al dia.', estado: 'En progreso', creadoEn: '2026-09-04T10:20:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Moron Centro', fechaProgramada: '2026-09-06' },
  { id: 4, clienteId: 2, tipo: 'Cambio de equipo', prioridad: 'Normal', descripcion: 'Reemplazo del equipo por falla detectada en la visita tecnica.', estado: 'Finalizado', creadoEn: '2026-09-01T09:10:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Castelar Norte', fechaProgramada: '2026-09-02', comentarioFinalizacion: 'Se reemplazó el equipo y se verificó la estabilidad de la conexión.' },
  { id: 5, clienteId: 3, tipo: 'Sin servicio', prioridad: 'Urgente', descripcion: 'El cliente no tiene servicio desde el inicio de la jornada.', estado: 'En progreso', creadoEn: '2026-09-19T08:40:00-03:00', tecnicoId: 7, agrupacionGeografica: 'Ramos Mejia', fechaProgramada: '2026-09-19' },
  { id: 6, clienteId: 4, tipo: 'Baja potencia', prioridad: 'Alta', descripcion: 'Se detecta baja potencia en el domicilio del cliente.', estado: 'En progreso', creadoEn: '2026-09-19T09:05:00-03:00', tecnicoId: 8, agrupacionGeografica: 'Haedo Centro', fechaProgramada: '2026-09-19' },
  { id: 7, clienteId: 5, tipo: 'Corte intermitente', prioridad: 'Normal', descripcion: 'La conexion presenta cortes breves durante el dia.', estado: 'Asignado', creadoEn: '2026-09-19T09:30:00-03:00', tecnicoId: 9, agrupacionGeografica: 'Ituzaingo Norte', fechaProgramada: '2026-09-19' },
  { id: 8, clienteId: 6, tipo: 'Instalación', prioridad: 'Normal', descripcion: 'Instalacion de servicio nuevo de 300 MB.', estado: 'Asignado', creadoEn: '2026-10-10T11:00:00-03:00', tecnicoId: 6, agrupacionGeografica: 'Hurlingham Centro', fechaProgramada: '2026-10-16', esOrden: true },
  { id: 9, clienteId: 7, tipo: 'Instalación', prioridad: 'Alta', descripcion: 'Alta de servicio para cliente nuevo; requiere tendido desde la caja.', estado: 'Abierto', creadoEn: '2026-10-13T09:45:00-03:00', tecnicoId: null, agrupacionGeografica: 'Moreno Centro', fechaProgramada: '2026-10-17', esOrden: true },
  { id: 10, clienteId: 8, tipo: 'Sin servicio', prioridad: 'Urgente', descripcion: 'Corte total luego de una tormenta; posible fibra dañada.', estado: 'Abierto', creadoEn: '2026-10-15T07:50:00-03:00', tecnicoId: null, agrupacionGeografica: 'Castelar Sur', fechaProgramada: '2026-10-15' },
  { id: 11, clienteId: 9, tipo: 'Baja potencia', prioridad: 'Alta', descripcion: 'El comercio reporta lentitud en el sistema de cobro.', estado: 'Bloqueado', creadoEn: '2026-10-11T16:20:00-03:00', tecnicoId: 5, agrupacionGeografica: 'Moron Sur', fechaProgramada: '2026-10-14', motivoBloqueo: 'El cliente no permite el acceso hasta el fin de semana.' },
  { id: 12, clienteId: 4, tipo: 'Cambio de equipo', prioridad: 'Normal', descripcion: 'Cambio de router por uno con Wi-Fi 6.', estado: 'Asignado', creadoEn: '2026-10-12T10:10:00-03:00', tecnicoId: 4, agrupacionGeografica: 'Haedo Centro', fechaProgramada: '2026-10-16' },
  { id: 13, clienteId: 3, tipo: 'Corte intermitente', prioridad: 'Normal', descripcion: 'Microcortes por la noche.', estado: 'Finalizado', creadoEn: '2026-10-06T08:30:00-03:00', tecnicoId: 7, agrupacionGeografica: 'Ramos Mejia', fechaProgramada: '2026-10-07', finalizadoEn: '2026-10-07T12:40:00-03:00', jornadaId: 2, comentarioFinalizacion: 'Se reemplazó el conector en la caja y se normalizó la señal.' },
  { id: 14, clienteId: 1, tipo: 'Baja potencia', prioridad: 'Alta', descripcion: 'Potencia baja en el ONT.', estado: 'Finalizado', creadoEn: '2026-10-06T09:00:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Moron Centro', fechaProgramada: '2026-10-07', finalizadoEn: '2026-10-07T11:15:00-03:00', jornadaId: 1, comentarioFinalizacion: 'Se limpió el conector y se reacomodó el patchcord.' },
  { id: 15, clienteId: 2, tipo: 'Sin servicio', prioridad: 'Urgente', descripcion: 'Sin servicio desde ayer a la tarde.', estado: 'Finalizado', creadoEn: '2026-10-07T07:30:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Castelar Norte', fechaProgramada: '2026-10-07', finalizadoEn: '2026-10-07T15:20:00-03:00', jornadaId: 1, comentarioFinalizacion: 'Fibra cortada en la acometida; se hizo empalme nuevo.' },
  { id: 16, clienteId: 6, tipo: 'Baja de servicio', prioridad: 'Normal', descripcion: 'Retiro de equipos por baja solicitada por el cliente.', estado: 'Finalizado', creadoEn: '2026-10-08T10:00:00-03:00', tecnicoId: 6, agrupacionGeografica: 'Hurlingham Centro', fechaProgramada: '2026-10-09', finalizadoEn: '2026-10-09T10:50:00-03:00', jornadaId: 4, esOrden: true, comentarioFinalizacion: 'Se retiraron ONT y router; equipos en buen estado.' },
  { id: 17, clienteId: 5, tipo: 'Instalación', prioridad: 'Normal', descripcion: 'Instalacion de servicio nuevo.', estado: 'Finalizado', creadoEn: '2026-10-08T12:00:00-03:00', tecnicoId: 9, agrupacionGeografica: 'Ituzaingo Norte', fechaProgramada: '2026-10-09', finalizadoEn: '2026-10-09T16:30:00-03:00', jornadaId: 5, esOrden: true, comentarioFinalizacion: 'Instalación completa con prueba de velocidad satisfactoria.' },
  { id: 18, clienteId: 4, tipo: 'Corte intermitente', prioridad: 'Alta', descripcion: 'Cortes al usar telefonía IP.', estado: 'Finalizado', creadoEn: '2026-10-08T08:20:00-03:00', tecnicoId: 8, agrupacionGeografica: 'Haedo Centro', fechaProgramada: '2026-10-08', finalizadoEn: '2026-10-08T13:05:00-03:00', jornadaId: 3, comentarioFinalizacion: 'Se actualizó el firmware del equipo y se configuró QoS.' },
  { id: 19, clienteId: 7, tipo: 'Sin servicio', prioridad: 'Urgente', descripcion: 'Sin servicio tras corte de luz.', estado: 'En progreso', creadoEn: '2026-10-15T08:10:00-03:00', tecnicoId: 5, agrupacionGeografica: 'Moreno Centro', fechaProgramada: '2026-10-15' },
  { id: 20, clienteId: 8, tipo: 'Cambio de equipo', prioridad: 'Normal', descripcion: 'Router con fuente quemada.', estado: 'Asignado', creadoEn: '2026-10-14T17:40:00-03:00', tecnicoId: 3, agrupacionGeografica: 'Castelar Sur', fechaProgramada: '2026-10-16' },
];

export const jornadasIniciales = [
  { id: 1, tecnicoId: 3, inicio: '2026-10-07T08:00:00-03:00', fin: '2026-10-07T16:30:00-03:00', kilometrajeInicial: 46510, kilometrajeFinal: 46598, activa: false },
  { id: 2, tecnicoId: 7, inicio: '2026-10-07T08:15:00-03:00', fin: '2026-10-07T15:00:00-03:00', kilometrajeInicial: 62700, kilometrajeFinal: 62764, activa: false },
  { id: 3, tecnicoId: 8, inicio: '2026-10-08T07:45:00-03:00', fin: '2026-10-08T14:30:00-03:00', kilometrajeInicial: 19610, kilometrajeFinal: 19672, activa: false },
  { id: 4, tecnicoId: 6, inicio: '2026-10-09T08:00:00-03:00', fin: '2026-10-09T13:20:00-03:00', kilometrajeInicial: 30105, kilometrajeFinal: 30148, activa: false },
  { id: 5, tecnicoId: 9, inicio: '2026-10-09T09:00:00-03:00', fin: '2026-10-09T17:45:00-03:00', kilometrajeInicial: 48210, kilometrajeFinal: 48297, activa: false },
];

// Datos adicionales para probar listados, filtros, asignaciones y reportes con volumen.
const hashContrasenaDemo = usuariosIniciales.find(({ id }) => id === 3).passwordHash;
const zonasDemo = ['Moron Centro', 'Castelar Norte', 'Ramos Mejia', 'Haedo Centro', 'Ituzaingo Norte', 'Hurlingham Centro', 'Moreno Centro', 'Castelar Sur'];
const nombresDemo = ['Agustin', 'Brenda', 'Cecilia', 'Dario', 'Emilia', 'Federico', 'Gabriela', 'Hugo', 'Irene', 'Julian'];
const apellidosDemo = ['Alvarez', 'Bustos', 'Cabrera', 'Dominguez', 'Escobar', 'Fernandez', 'Gomez', 'Herrera', 'Ibarra', 'Juarez', 'Klein', 'Luna', 'Maidana', 'Navarro', 'Ojeda'];
const tiposReclamoDemo = ['Sin servicio', 'Baja potencia', 'Corte intermitente', 'Cambio de equipo', 'Instalacion'];
const prioridadesDemo = ['Normal', 'Alta', 'Urgente'];

const tecnicosDemo = Array.from({ length: 30 }, (_, indice) => {
  const id = 10 + indice;
  const nombre = nombresDemo[indice % nombresDemo.length];
  const apellido = apellidosDemo[indice % apellidosDemo.length];
  const nombreUsuario = `tecnico.demo${indice + 1}`;
  const zona = zonasDemo[indice % zonasDemo.length];
  const activo = indice % 7 !== 6;
  return {
    usuario: {
      id,
      usuario: nombreUsuario,
      passwordHash: hashContrasenaDemo,
      nombre: `${nombre} ${apellido}`,
      rolId: 3,
      activo,
    },
    perfil: {
      usuarioId: id,
      documento: String(40000000 + indice * 137),
      fechaNacimiento: `1990-${String((indice % 9) + 1).padStart(2, '0')}-${String((indice % 28) + 1).padStart(2, '0')}`,
      vencimientoRegistro: '2027-12-31',
      telefono: `11-5${String(200 + indice).padStart(3, '0')}-${String(1000 + indice).slice(-4)}`,
      email: `${nombreUsuario}@galactic.app`,
      direccion: `${100 + indice} ${['Rivadavia', 'Sarmiento', 'Belgrano', 'San Martin'][indice % 4]}, ${zona}`,
    },
  };
});

for (const { usuario, perfil } of tecnicosDemo) {
  usuariosIniciales.push(usuario);
  tecnicoPerfilesIniciales.push(perfil);
}

for (let indice = 0; indice < 155; indice += 1) {
  const id = 11 + indice;
  const nombre = nombresDemo[(indice + 3) % nombresDemo.length];
  const apellido = apellidosDemo[(indice * 3) % apellidosDemo.length];
  const zona = zonasDemo[indice % zonasDemo.length];
  clientesIniciales.push({
    id,
    nombre: `${nombre} ${apellido} ${indice + 1}`,
    documento: String(42000000 + indice * 113),
    telefono: `11-4${String(500 + indice).padStart(3, '0')}-${String(1000 + indice).slice(-4)}`,
    email: `cliente.demo${indice + 1}@galactic.app`,
    direccion: `${200 + indice} ${['Rivadavia', 'Sarmiento', 'Belgrano', 'San Martin'][indice % 4]}, ${zona}`,
    activo: indice % 19 !== 18,
    coordenadas: {
      latitud: -34.59 - ((indice * 17) % 80) / 1000,
      longitud: -58.55 - ((indice * 23) % 240) / 1000,
    },
    zona,
  });
}

for (let indice = 0; indice < 12; indice += 1) {
  const id = 10 + indice;
  const tecnicoId = 10 + (indice % 12);
  vehiculosIniciales.push({
    id,
    patente: `AK ${String(100 + indice).slice(-3)} ${String.fromCharCode(65 + indice)}${String.fromCharCode(66 + indice)}`,
    marca: ['Renault', 'Fiat', 'Ford', 'Peugeot'][indice % 4],
    modelo: ['Kangoo', 'Fiorino', 'Ranger', 'Partner'][indice % 4],
    tecnicoAsignado: tecnicoId,
    kilometraje: { inicial: 12000 + indice * 1870, actual: 13200 + indice * 1930, final: null },
    seguro: { compania: 'La Segunda', poliza: `DM-${10000 + indice}`, vence: '2027-12-31' },
    ultimoService: '2026-09-15',
    detalle: 'Vehiculo demo para pruebas de asignaciones y jornadas.',
    disponible: indice % 5 !== 4,
  });
}

for (let indice = 0; indice < 60; indice += 1) {
  const clienteId = 11 + indice;
  const tecnicoId = indice < 30 ? 10 + ((indice * 7) % 30) : null;
  const estado = tecnicoId ? ['Asignado', 'En progreso', 'Finalizado'][indice % 3] : 'Abierto';
  reclamosIniciales.push({
    id: 21 + indice,
    clienteId,
    tipo: tiposReclamoDemo[indice % tiposReclamoDemo.length],
    prioridad: prioridadesDemo[indice % prioridadesDemo.length],
    descripcion: `Reclamo demo ${indice + 1} para validar la asignacion del servicio.`,
    estado,
    creadoEn: `2026-10-${String((indice % 15) + 1).padStart(2, '0')}T${String((indice % 8) + 8).padStart(2, '0')}:00:00-03:00`,
    tecnicoId,
    agrupacionGeografica: zonasDemo[indice % zonasDemo.length],
    fechaProgramada: `2026-10-${String((indice % 20) + 1).padStart(2, '0')}`,
    ...(estado === 'Finalizado' ? {
      finalizadoEn: '2026-10-20T16:00:00-03:00',
      jornadaId: 6 + ((tecnicoId - 3) * 12) + (indice % 12),
      comentarioFinalizacion: 'Servicio demo finalizado correctamente.',
    } : {}),
  });
}

let siguienteJornadaDemo = Math.max(...jornadasIniciales.map(({ id }) => id)) + 1;
for (const tecnico of usuariosIniciales.filter(({ rolId }) => rolId === 3)) {
  for (let indice = 0; indice < 12; indice += 1) {
    const dia = 20 - indice;
    jornadasIniciales.push({
      id: siguienteJornadaDemo,
      tecnicoId: tecnico.id,
      inicio: `2026-09-${String(dia).padStart(2, '0')}T08:00:00-03:00`,
      fin: `2026-09-${String(dia).padStart(2, '0')}T16:00:00-03:00`,
      kilometrajeInicial: 10000 + tecnico.id * 100 + indice * 40,
      kilometrajeFinal: 10070 + tecnico.id * 100 + indice * 40,
      activa: false,
    });
    siguienteJornadaDemo += 1;
  }

  // Solo parte de los técnicos queda actualmente en jornada, para probar ambos estados.
  if (tecnico.id % 3 === 0) {
    jornadasIniciales.push({
      id: siguienteJornadaDemo,
      tecnicoId: tecnico.id,
      inicio: '2026-10-25T08:00:00-03:00',
      fin: null,
      kilometrajeInicial: 20000 + tecnico.id * 100,
      kilometrajeFinal: null,
      activa: true,
    });
    siguienteJornadaDemo += 1;
  }
}
