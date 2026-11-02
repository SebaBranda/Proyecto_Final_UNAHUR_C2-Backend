import { jornadasRepository } from '../repositories/jornadas.repository.js';

// Sin jornada activa, el técnico no puede ver ni trabajar sus reclamos (ni los datos de sus clientes).
export const JORNADA_INACTIVA = {
  codigo: 'JORNADA_INACTIVA',
  mensaje: 'Iniciá tu jornada para ver y trabajar en tus reclamos.',
};

// Devuelve la jornada activa del técnico. Para admin y coordinador no aplica: devuelve null.
export async function jornadaActivaDelTecnico(usuario) {
  if (usuario?.rolId !== 3) return null;
  return jornadasRepository.buscarActiva(Number(usuario.id));
}
