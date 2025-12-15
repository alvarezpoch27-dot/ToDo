/// <reference types="jasmine" />
import { EncryptionService } from './encryption.service';
import * as encryptionUtil from '../utils/encryption.util';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('encryptString', () => {
    it('should throw error if no key is set', async () => {
      await expectAsync(service.encryptString('test')).toBeRejectedWithError('Encryption key not set');
    });

    it('should encrypt string with valid key', async () => {
      const key = new Uint8Array(32).fill(1);
      service.setEncryptionKey(key);

      const mockResult = { iv: 'iv', ciphertext: 'cipher', authTag: 'tag' };
      spyOn((encryptionUtil as any).encryptionUtilWritable, 'encrypt').and.returnValue(Promise.resolve(mockResult));

      const result = await service.encryptString('test data');
      expect(result).toBeDefined();
      expect((encryptionUtil as any).encryptionUtilWritable.encrypt).toHaveBeenCalledWith('test data', key);
    });
  });

  describe('decryptString', () => {
    it('should throw error if no key is set', async () => {
      await expectAsync(service.decryptString('encrypted')).toBeRejectedWithError('Encryption key not set');
    });

    it('should decrypt string with valid key', async () => {
      const key = new Uint8Array(32).fill(1);
      service.setEncryptionKey(key);

      const encrypted = JSON.stringify({ iv: 'iv', ciphertext: 'cipher', authTag: 'tag' });
      spyOn((encryptionUtil as any).encryptionUtilWritable, 'decrypt').and.returnValue(Promise.resolve('decrypted data'));

      const result = await service.decryptString(encrypted);
      expect(result).toBe('decrypted data');
      expect((encryptionUtil as any).encryptionUtilWritable.decrypt).toHaveBeenCalled();
    });
  });

  describe('encryptObject', () => {
    it('should encrypt object as JSON', async () => {
      const key = new Uint8Array(32).fill(1);
      service.setEncryptionKey(key);

      const obj = { name: 'test', value: 123 };
      const mockResult = { iv: 'iv', ciphertext: 'cipher', authTag: 'tag' };
      spyOn((encryptionUtil as any).encryptionUtilWritable, 'encrypt').and.returnValue(Promise.resolve(mockResult));

      const result = await service.encryptObject(obj);
      expect(result).toBeDefined();
    });
  });

  describe('clearKey', () => {
    it('should clear encryption key', () => {
      const key = new Uint8Array(32).fill(1);
      service.setEncryptionKey(key);
      expect(service.getEncryptionKey()).not.toBeNull();

      service.clearKey();
      expect(service.getEncryptionKey()).toBeNull();
    });
  });
});
