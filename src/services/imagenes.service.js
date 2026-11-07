import { randomUUID } from 'node:crypto';
import { imagenesRepository } from '../repositories/imagenes.repository.js';

export const MAXIMO_IMAGENES_POR_PEDIDO = 6;
const MAXIMO_BYTES = 600 * 1024;
const formatoDataUrl = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/;

const esGestion = (usuario) => [1, 2].includes(usuario.rolId);
const resultado = (status, body) => ({ status, body });
const bytesDeBase64 = (base64) => Math.floor((base64.length * 3) / 4) - (base64.match(/=+$/)?.[0].length ?? 0);
const datosPublicos = ({ id, url, creadoEn }) => ({ id, url, creadoEn });

function validarContenido(imagenes) {
  if (!Array.isArray(imagenes) || !imagenes.length) return 'Enviá al menos una imagen.';
  if (imagenes.length > MAXIMO_IMAGENES_POR_PEDIDO) {
    return `Podés subir hasta ${MAXIMO_IMAGENES_POR_PEDIDO} imágenes por vez.`;
  }
  for (const [indice, imagen] of imagenes.entries()) {
    const coincidencia = typeof imagen === 'string' && imagen.match(formatoDataUrl);
    if (!coincidencia) return `La imagen ${indice + 1} no es válida. Usá imágenes JPG, PNG o WebP.`;
    if (bytesDeBase64(coincidencia[2]) > MAXIMO_BYTES) {
      return `La imagen ${indice + 1} es demasiado pesada (máximo ${MAXIMO_BYTES / 1024} KB).`;
    }
  }
  return null;
}

export const imagenesService = {
  async subir(imagenes, usuario) {
    const error = validarContenido(imagenes);
    if (error) return resultado(400, { mensaje: error });
    const creadas = [];
    for (const url of imagenes) {
      creadas.push(await imagenesRepository.crear({
        id: randomUUID(),
        url,
        tamano: bytesDeBase64(url.slice(url.indexOf(',') + 1)),
        subidoPor: Number(usuario.id),
        creadoEn: new Date().toISOString(),
      }));
    }
    return resultado(201, creadas.map(({ id }) => ({ id })));
  },

  // Los ids son UUID aleatorios: solo puede pedir una imagen quien recibió su id al ver
  // el reclamo, la jornada o el vehículo que la referencia.
  async obtener(ids) {
    const lista = (Array.isArray(ids) ? ids : [])
      .filter((id) => typeof id === 'string' && id.trim())
      .slice(0, 50);
    if (!lista.length) return resultado(400, { mensaje: 'Indicá los ids de las imágenes (?ids=a,b,c).' });
    return resultado(200, (await imagenesRepository.buscarPorIds(lista)).map(datosPublicos));
  },

  async obtenerUna(id) {
    const [imagen] = await imagenesRepository.buscarPorIds([id]);
    return imagen ? resultado(200, datosPublicos(imagen)) : resultado(404, { mensaje: 'Imagen no encontrada' });
  },

  // Valida los ids que alguien quiere guardar en el campo "imagenes" de un registro.
  // Devuelve un mensaje de error para mostrar al usuario, o null si son válidos.
  async validarReferencias(ids, usuario, { minimo = 0, maximo = MAXIMO_IMAGENES_POR_PEDIDO } = {}) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) return 'Las imágenes enviadas no son válidas.';
    if (new Set(ids).size !== ids.length) return 'La misma imagen está repetida.';
    if (ids.length < minimo || ids.length > maximo) {
      return minimo === maximo
        ? `Se requieren exactamente ${minimo} imágenes.`
        : `Se requieren entre ${minimo} y ${maximo} imágenes.`;
    }
    const imagenes = await imagenesRepository.buscarPorIds(ids);
    if (imagenes.length !== ids.length) return 'Alguna de las imágenes no existe. Volvé a cargarlas.';
    if (!esGestion(usuario) && imagenes.some((imagen) => imagen.subidoPor !== Number(usuario.id))) {
      return 'Solo podés usar imágenes que subiste vos.';
    }
    return null;
  },
};
