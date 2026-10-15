import {
  AdminProfile,
  Cliente,
  CoordinadorProfile,
  TecnicoProfile,
  Usuario,
  Vehiculo,
  Reclamo,
  Jornada,
} from '../models/schemas.js';
import {
  adminPerfilesIniciales,
  clientesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
  usuariosIniciales,
  vehiculosIniciales,
  reclamosIniciales,
  jornadasIniciales,
} from '../data/store.js';

export async function sembrarDatosIniciales() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('Seed de datos demo deshabilitado.');
    return;
  }
  for (const usuario of usuariosIniciales) {
    await Usuario.updateOne(
      { id: usuario.id },
      { $setOnInsert: usuario },
      { upsert: true },
    );
  }

  await sincronizarPerfiles(AdminProfile, adminPerfilesIniciales);
  await sincronizarPerfiles(CoordinadorProfile, coordinadorPerfilesIniciales);
  await sincronizarPerfiles(TecnicoProfile, tecnicoPerfilesIniciales);

  for (const cliente of clientesIniciales) {
    await Cliente.updateOne(
      { id: cliente.id },
      { $setOnInsert: cliente },
      { upsert: true },
    );
  }
  await sincronizarRegistros(Vehiculo, vehiculosIniciales);
  await sincronizarRegistros(Reclamo, reclamosIniciales);
  await sincronizarRegistros(Jornada, jornadasIniciales);
  console.log('Datos iniciales verificados en MongoDB');
}

async function sincronizarPerfiles(Modelo, perfiles) {
  for (const perfil of perfiles) {
    await Modelo.updateOne(
      { usuarioId: perfil.usuarioId },
      { $setOnInsert: perfil },
      { upsert: true },
    );
  }

}

async function sincronizarRegistros(Modelo, registros) {
  for (const registro of registros) {
    await Modelo.updateOne({ id: registro.id }, { $setOnInsert: registro }, { upsert: true });
  }
}
