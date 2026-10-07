import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
  return `scrypt$v1$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, encodedHash) {
  const [algorithm, version, salt, storedHash, extra] = encodedHash?.split('$') ?? [];
  if (algorithm !== 'scrypt' || version !== 'v1' || !salt || !storedHash
    || extra !== undefined || !/^[a-f0-9]{32}$/.test(salt)) {
    throw new Error('El hash de contraseña almacenado no tiene un formato válido');
  }

  const expected = Buffer.from(storedHash, 'hex');
  if (expected.length !== KEY_LENGTH || expected.toString('hex') !== storedHash) {
    throw new Error('El hash de contraseña almacenado no tiene un formato válido');
  }

  const actual = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
  return timingSafeEqual(expected, actual);
}
