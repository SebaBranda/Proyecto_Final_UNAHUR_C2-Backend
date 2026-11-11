import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Almacenamiento de archivos en un bucket compatible con S3 (Oracle Object Storage, Amazon S3,
// OVH, etc.). Para cambiar de proveedor alcanza con cambiar las variables S3_* del .env.

const VARIABLES = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
const DURACION_URL_SEGUNDOS = 60 * 60;

let cliente = null;

export const almacenamientoConfigurado = () => VARIABLES.every((nombre) => process.env[nombre]);

// El cliente se crea recién en el primer uso, cuando el .env ya está cargado.
function obtenerCliente() {
  if (!almacenamientoConfigurado()) {
    throw new Error(`Falta configurar el almacenamiento de imágenes (${VARIABLES.join(', ')}).`);
  }
  cliente ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    // Oracle exige la dirección con el bucket en la ruta y no acepta los checksums automáticos.
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return cliente;
}

export async function subirArchivo(clave, contenido, tipo) {
  await obtenerCliente().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: clave,
    Body: contenido,
    ContentType: tipo,
  }));
}

// Link para ver un archivo del bucket (que es privado). Vence en una hora.
export function urlTemporal(clave) {
  const pedido = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clave });
  return getSignedUrl(obtenerCliente(), pedido, { expiresIn: DURACION_URL_SEGUNDOS });
}

export async function borrarArchivo(clave) {
  await obtenerCliente().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clave }));
}
