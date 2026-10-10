import {
  AdminProfile,
  Cliente,
  CoordinadorProfile,
  TecnicoProfile,
  Usuario,
} from '../models/schemas.js';
import {
  adminPerfilesIniciales,
  clientesIniciales,
  coordinadorPerfilesIniciales,
  tecnicoPerfilesIniciales,
  usuariosIniciales,
} from '../data/store.js';

export async function sembrarDatosIniciales() {
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
