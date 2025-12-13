import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private key: CryptoKey | null = null;

  // Derive AES-GCM 256-bit key from a token (e.g. Firebase ID token)
  async setKeyFromToken(token: string): Promise<void> {
    const enc = new TextEncoder().encode(token);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    this.key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  clearKey(): void {
    this.key = null;
  }

  private toBase64(buf: ArrayBuffer) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private fromBase64(b64: string) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async encryptString(plaintext: string): Promise<string> {
    if (!this.key) throw new Error('No encryption key');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(plaintext);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, enc);
    // store iv + cipher as base64 JSON
    return JSON.stringify({ iv: this.toBase64(iv.buffer), data: this.toBase64(ct) });
  }

  async decryptString(payload: string): Promise<string> {
    if (!this.key) throw new Error('No encryption key');
    try {
      const parsed = JSON.parse(payload);
      const iv = new Uint8Array(this.fromBase64(parsed.iv));
      const data = this.fromBase64(parsed.data);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key, data);
      return new TextDecoder().decode(pt);
    } catch (e) {
      throw new Error('Decryption failed');
    }
  }

  // Helpers that try decrypting if key present; otherwise return original
  async maybeDecryptString(payload: string | null): Promise<string | null> {
    if (!payload) return null;
    if (!this.key) return payload;
    try {
      return await this.decryptString(payload);
    } catch {
      return null;
    }
  }
}
