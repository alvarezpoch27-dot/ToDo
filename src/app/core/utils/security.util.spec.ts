/// <reference types="jasmine" />
import { validateEmail, validatePassword, generateUUID, pbkdf2Hash, verifyPassword } from '../utils/security.util';

describe('Security Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('MyPassword123!@#')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('1234567')).toBe(false);
    });
  });

  describe('pbkdf2Hash', () => {
    it('should hash password with generated salt', async () => {
      const password = 'TestPassword123';
      const result = await pbkdf2Hash(password);

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.iterations).toBe(100_000);
    });

    it('should hash with provided salt', async () => {
      const password = 'TestPassword123';
      const salt = 'test-salt';
      const result = await pbkdf2Hash(password, salt);

      expect(result.salt).toBe(salt);
    });

    it('should throw error for low iterations', async () => {
      await expectAsync(pbkdf2Hash('password', 'salt', 1000)).toBeRejected();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const { salt, hash, iterations } = await pbkdf2Hash(password);

      const isValid = await verifyPassword(password, hash, salt, iterations);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const { salt, hash, iterations } = await pbkdf2Hash('CorrectPassword');

      const isValid = await verifyPassword('WrongPassword', hash, salt, iterations);
      expect(isValid).toBe(false);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
    });
  });
});
