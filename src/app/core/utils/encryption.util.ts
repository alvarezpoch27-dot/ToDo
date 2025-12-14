// Node `crypto` is used only in Node environments (tests or server-side). Hide static import
const nodeCrypto: any = (typeof window === 'undefined' && typeof require === 'function')
  ? eval('require')('crypto')
  : null;

/**
 * Utilidades de cifrado AES-256-GCM
 */

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const IV_LENGTH = 12;

function bufferToHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  if (!hex) return new Uint8Array(0);
  const clean = hex.length % 2 === 0 ? hex : '0' + hex;
  const len = clean.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

export interface CipherResult {
  iv: string;
  ciphertext: string;
  authTag: string;
}

/**
 * Derivar clave AES-256 desde contraseña usando PBKDF2
 */
export async function deriveKey(
  password: string,
  salt?: string
): Promise<{ key: Buffer | Uint8Array; salt: string }> {
  // If running in Node (tests) use nodeCrypto, otherwise use Web Crypto
  const actualSalt = salt || (nodeCrypto ? nodeCrypto.randomBytes(SALT_LENGTH).toString('hex') : null);

  if (nodeCrypto) {
    return new Promise((resolve, reject) => {
      nodeCrypto.pbkdf2(password, actualSalt, 100_000, 32, 'sha256', (err: Error | null, derivedKey: Buffer) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          key: derivedKey,
          salt: actualSalt,
        });
      });
    });
  }

  // Browser: use Web Crypto
  if (globalThis.crypto && (globalThis.crypto as any).subtle) {
    const subtle = (globalThis.crypto as any).subtle as SubtleCrypto;
    const actualSaltHex = actualSalt || (() => {
      const s = new Uint8Array(SALT_LENGTH);
      globalThis.crypto.getRandomValues(s);
      return Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('');
    })();

    const saltBytes = hexToUint8Array(actualSaltHex);
    const enc = new TextEncoder();
    return (async () => {
      const pwKey = await (subtle as any).importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
      const derived = await (subtle as any).deriveBits({ name: 'PBKDF2', salt: saltBytes as any, iterations: 100_000, hash: 'SHA-256' }, pwKey, 32 * 8);
      return { key: new Uint8Array(derived), salt: actualSaltHex };
    })();
  }

  return Promise.reject(new Error('No crypto available'));
}

/**
 * Cifrar datos con AES-256-GCM
 */
export function encrypt(plaintext: string, key: Buffer | Uint8Array): CipherResult {
  if (nodeCrypto) {
    const keyBuf: Buffer = Buffer.isBuffer(key) ? (key as Buffer) : Buffer.from(key as Uint8Array);

    const iv = nodeCrypto.randomBytes(IV_LENGTH);
    const cipher = nodeCrypto.createCipheriv(ALGORITHM, keyBuf, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      ciphertext: encrypted,
      authTag: authTag.toString('hex'),
    };
  }

  // Browser Web Crypto
  if (globalThis.crypto && (globalThis.crypto as any).subtle) {
    const subtle = (globalThis.crypto as any).subtle as SubtleCrypto;
    const iv = new Uint8Array(IV_LENGTH);
    globalThis.crypto.getRandomValues(iv);
    const enc = new TextEncoder();
    const keyBuf = key instanceof Uint8Array ? key : new Uint8Array(key as any);

    return (() => {
      // Import raw key as CryptoKey for AES-GCM
      return (async (): Promise<CipherResult> => {
        const cryptoKey = await (subtle as any).importKey('raw', keyBuf as any, { name: 'AES-GCM' }, false, ['encrypt']);
        const encrypted = await (subtle as any).encrypt({ name: 'AES-GCM', iv: iv as any }, cryptoKey, enc.encode(plaintext) as any);
        const encryptedBytes = new Uint8Array(encrypted);
        // Split ciphertext and auth tag (last TAG_LENGTH bytes)
        const tag = encryptedBytes.slice(encryptedBytes.length - TAG_LENGTH);
        const cipherBytes = encryptedBytes.slice(0, encryptedBytes.length - TAG_LENGTH);
        return {
          iv: bufferToHex(iv),
          ciphertext: bufferToHex(cipherBytes),
          authTag: bufferToHex(tag),
        };
      })();
    })() as unknown as CipherResult;
  }

  throw new Error('No crypto available for encrypt');
}

/**
 * Descifrar datos con AES-256-GCM
 */
export function decrypt(cipherResult: CipherResult, key: Buffer | Uint8Array): string {
  if (nodeCrypto) {
    const keyBuf: Buffer = Buffer.isBuffer(key) ? (key as Buffer) : Buffer.from(key as Uint8Array);

    const decipher = nodeCrypto.createDecipheriv(
      ALGORITHM,
      keyBuf,
      Buffer.from(cipherResult.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(cipherResult.authTag, 'hex'));

    let decrypted = decipher.update(cipherResult.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Browser Web Crypto
  if (globalThis.crypto && (globalThis.crypto as any).subtle) {
    const subtle = (globalThis.crypto as any).subtle as SubtleCrypto;
    const iv = hexToUint8Array(cipherResult.iv);
    const tag = hexToUint8Array(cipherResult.authTag);
    const cipher = hexToUint8Array(cipherResult.ciphertext);
    const combined = new Uint8Array(cipher.length + tag.length);
    combined.set(cipher, 0);
    combined.set(tag, cipher.length);
    const keyBuf = key instanceof Uint8Array ? key : new Uint8Array(key as any);
    const dec = new TextDecoder();
    return (async () => {
      const cryptoKey = await (subtle as any).importKey('raw', keyBuf as any, { name: 'AES-GCM' }, false, ['decrypt']);
      const decrypted = await (subtle as any).decrypt({ name: 'AES-GCM', iv: iv as any }, cryptoKey, combined.buffer as any);
      return dec.decode(new Uint8Array(decrypted));
    })() as unknown as string;
  }

  throw new Error('No crypto available for decrypt');
}

/**
 * Cifrar objeto JSON
 */
export function encryptObject<T>(obj: T, key: Buffer | Uint8Array): string {
  const json = JSON.stringify(obj);
  const cipherResult = encrypt(json, key);
  return JSON.stringify(cipherResult);
}

/**
 * Descifrar objeto JSON
 */
export function decryptObject<T>(encrypted: string, key: Buffer | Uint8Array): T {
  const cipherResult = JSON.parse(encrypted) as CipherResult;
  const json = decrypt(cipherResult, key);
  return JSON.parse(json) as T;
}

export const encryptionUtilWritable = {
  deriveKey,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
};
