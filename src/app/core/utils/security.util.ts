/**
 * Utilidades de seguridad y criptografía
 * - PBKDF2 para hashing de contraseñas (Web Crypto con fallback a Node)
 * - Validadores
 * - Generadores de salt
 */

const MIN_ITERATIONS = 100_000;
const SALT_LENGTH = 32; // bytes
const KEYLEN = 64; // bytes

export interface HashResult {
  salt: string; // hex
  hash: string; // hex
  iterations: number;
}

function isWebCryptoAvailable(): boolean {
  return typeof globalThis !== 'undefined' && !!(globalThis.crypto && (globalThis.crypto as any).subtle);
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8(hex: string): Uint8Array {
  if (!hex) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generar salt aleatorio (hex)
 */
export function generateSalt(): string {
  if (isWebCryptoAvailable()) {
    const arr = new Uint8Array(SALT_LENGTH);
    (globalThis.crypto as any).getRandomValues(arr);
    return toHex(arr);
  }

  // Node fallback
  // Node fallback (use eval('require') to avoid bundlers resolving the module for browser builds)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = typeof require === 'function' ? eval('require')('crypto') : null;
    if (nodeCrypto) return nodeCrypto.randomBytes(SALT_LENGTH).toString('hex');
  } catch {
    /* ignore */
  }
  throw new Error('No crypto provider available');
}

/**
 * Hash de contraseña con PBKDF2 (Web Crypto preferido)
 * @param password Contraseña en texto plano
 * @param salt Salt (hex) - se genera si no se proporciona
 * @param iterations Iteraciones (mínimo 100,000)
 */
export async function pbkdf2Hash(
  password: string,
  salt?: string,
  iterations: number = MIN_ITERATIONS
): Promise<HashResult> {
  if (iterations < MIN_ITERATIONS) {
    throw new Error(`Las iteraciones deben ser >= ${MIN_ITERATIONS}`);
  }

  const actualSalt = salt || generateSalt();

  // Web Crypto implementation
  if (isWebCryptoAvailable()) {
    const enc = new TextEncoder();
    const passKey = enc.encode(password);
    const saltBytes = hexToUint8(actualSalt);

    const keyMaterial = await (globalThis.crypto as any).subtle.importKey(
      'raw',
      passKey,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await (globalThis.crypto as any).subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEYLEN * 8
    );

    const derived = new Uint8Array(derivedBits);
    return {
      salt: actualSalt,
      hash: toHex(derived),
      iterations,
    };
  }

  // Node fallback
  try {
    const nodeCrypto = typeof require === 'function' ? eval('require')('crypto') : null;
    if (!nodeCrypto) throw new Error('Node crypto not available');

    return new Promise<HashResult>((resolve, reject) => {
      nodeCrypto.pbkdf2(password, actualSalt, iterations, KEYLEN, 'sha256', (err: Error | null, derived: Buffer) => {
        if (err) return reject(err);
        resolve({ salt: actualSalt, hash: derived.toString('hex'), iterations });
      });
    });
  } catch (err) {
    throw err;
  }
}

/**
 * Comparación en tiempo constante para evitar side-channel
 */
function constantTimeEqual(aHex: string, bHex: string): boolean {
  try {
    const a = hexToUint8(aHex);
    const b = hexToUint8(bHex);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Verificar contraseña contra hash almacenado
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
  iterations: number
): Promise<boolean> {
  try {
    const result = await pbkdf2Hash(password, salt, iterations);
    return constantTimeEqual(result.hash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Validar email
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validar contraseña (al menos 8 caracteres)
 */
export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * Validar URL
 */
export function validateUrl(url: string): boolean {
  try {
    // Constructor URL disponible en navegador y Node
    // tslint:disable-next-line: no-unused-expression
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * UUID v4
 */
export function generateUUID(): string {
  if (isWebCryptoAvailable() && typeof (globalThis.crypto as any).randomUUID === 'function') {
    return (globalThis.crypto as any).randomUUID();
  }
  // Node fallback
  try {
    const nodeCrypto = typeof require === 'function' ? eval('require')('crypto') : null;
    if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
  } catch {
    /* ignore */
  }

  // Fallback: generate RFC4122 v4 UUID using WebCrypto if available, else Math.random
  const rnds = isWebCryptoAvailable()
    ? (globalThis.crypto as any).getRandomValues(new Uint8Array(16))
    : (() => {
        const arr = new Uint8Array(16);
        for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      })();

  // Per RFC4122 v4
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(rnds[i].toString(16).padStart(2, '0'));
  }
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
