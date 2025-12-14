import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import * as encryptionUtil from '../utils/encryption.util';
import { CipherResult } from '../utils/encryption.util';
import { Logger } from '../utils/logger.util';
import { environment } from '../../../environments/environment';

/**
 * Servicio de cifrado AES-256-GCM
 * Usado para proteger:
 * - Tareas almacenadas localmente
 * - Coordenadas GPS
 * - Metadatos de imágenes
 * - Tokens locales
 */
@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private encryptionKey: Uint8Array | null = null;
  private logger = new Logger('EncryptionService', environment.debug);

  /**
   * Establecer clave de cifrado desde FirebaseToken
   */
  async setKeyFromToken(token: string): Promise<void> {
    try {
      const { key } = await encryptionUtil.deriveKey(token);
      this.encryptionKey = key;
      this.logger.debug('Encryption key set from Firebase token');
    } catch (error) {
      this.logger.error('Error setting encryption key from token', error);
      throw error;
    }
  }

  /**
   * Establecer clave de cifrado directamente
   */
  setEncryptionKey(key: Uint8Array): void {
    this.encryptionKey = key;
  }

  /**
   * Obtener clave de cifrado actual
   */
  getEncryptionKey(): Uint8Array | null {
    return this.encryptionKey;
  }

  /**
   * Limpiar clave de cifrado
   */
  clearKey(): void {
    this.encryptionKey = null;
  }

  /**
   * Cifrar string
   */
  async encryptString(plaintext: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }
    const result = await Promise.resolve(encryptionUtil.encryptionUtilWritable.encrypt(plaintext, this.encryptionKey as any));
    return JSON.stringify(result as any);
  }

  /**
   * Descifrar string
   */
  async decryptString(encrypted: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    try {
      const cipherResult: CipherResult = JSON.parse(encrypted);
      const result = await Promise.resolve(encryptionUtil.encryptionUtilWritable.decrypt(cipherResult, this.encryptionKey as any));
      return result as any;
    } catch (error) {
      this.logger.error('Error decrypting string', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Cifrar objeto JSON
   */
  async encryptObject<T>(obj: T): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }
    const result = await Promise.resolve(encryptionUtil.encryptionUtilWritable.encryptObject(obj, this.encryptionKey as any));
    return result as any;
  }

  /**
   * Descifrar objeto JSON
   */
  async decryptObject<T>(encrypted: string): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    try {
      const result = await Promise.resolve(encryptionUtil.encryptionUtilWritable.decryptObject<T>(encrypted, this.encryptionKey as any));
      return result as any;
    } catch (error) {
      this.logger.error('Error decrypting object', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Intentar descifrar (retorna null si falla)
   */
  async maybeDecryptString(encrypted: string): Promise<string | null> {
    if (!this.encryptionKey) {
      return null;
    }

    try {
      return await this.decryptString(encrypted);
    } catch {
      return null;
    }
  }

  /**
   * Cifrar y almacenar en Preferences
   */
  async encryptAndStore<T>(key: string, data: T): Promise<void> {
    try {
      const encrypted = await this.encryptObject(data);
      await Preferences.set({ key, value: encrypted });
      this.logger.debug(`Data encrypted and stored: ${key}`);
    } catch (error) {
      this.logger.error(`Error storing encrypted data (${key})`, error);
      throw error;
    }
  }

  /**
   * Cargar y descifrar desde Preferences
   */
  async loadAndDecrypt<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return null;

      return await this.decryptObject<T>(value);
    } catch (error) {
      this.logger.error(`Error loading encrypted data (${key})`, error);
      return null;
    }
  }
}
