import { evidenciasRepository } from '../repositories/evidencias.repository.js';

export const MAXIMO_EVIDENCIAS = 5;
const MAXIMO_BYTES = 600 * 1024;
const formatoDataUrl = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/;

const bytesDeBase64 = (base64) => Math.floor((base64.length * 3) / 4) - (base64.match(/=+$/)?.[0].length ?? 0);

export function validarEvidencias(imagenes, cantidadActual = 0) {
  if (!Array.isArray(imagenes) || !imagenes.length) return 'Adjuntá al menos una foto del trabajo.';
  if (cantidadActual + imagenes.length > MAXIMO_EVIDENCIAS) {
    return `Podés adjuntar hasta ${MAXIMO_EVIDENCIAS} fotos por reclamo.`;
  }
  for (const [indice, imagen] of imagenes.entries()) {
    const coincidencia = typeof imagen === 'string' && imagen.match(formatoDataUrl);
    if (!coincidencia) return `La foto ${indice + 1} no es válida. Usá fotos JPG, PNG o WebP.`;
    if (bytesDeBase64(coincidencia[2]) > MAXIMO_BYTES) {
      return `La foto ${indice + 1} es demasiado pesada (máximo ${MAXIMO_BYTES / 1024} KB).`;
    }
  }
  return null;
}

export const evidenciasService = {
  async guardar(reclamoId, imagenes, usuarioId) {
    for (const imagen of imagenes) {
      await evidenciasRepository.crear({
        reclamoId,
        url: imagen,
        subidoPor: Number(usuarioId),
        creadoEn: new Date().toISOString(),
      });
    }
  },

  // Se llama al eliminar un reclamo, para no dejar fotos huérfanas.
  async eliminarDeReclamo(reclamoId) {
    return evidenciasRepository.eliminarPorReclamo(reclamoId);
  },

  async listar(reclamoId) {
    const evidencias = await evidenciasRepository.listar({ reclamoId });
    return evidencias.map(({ id, url, creadoEn }) => ({ id, url, creadoEn }));
  },
};
