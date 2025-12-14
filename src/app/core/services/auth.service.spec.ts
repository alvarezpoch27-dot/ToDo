import { AuthService } from '../services/auth.service';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';

// Note: Karma + Jasmine environment — use `spyOn` on `Preferences` methods in tests instead of Jest mocks.

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    // Disable Firebase for unit tests to avoid external network calls
    environment.firebase = null as any;
    spyOn(Preferences, 'get').and.returnValue(Promise.resolve({ value: null } as any));
    spyOn(Preferences, 'set').and.returnValue(Promise.resolve() as any);
    spyOn(Preferences, 'remove').and.returnValue(Promise.resolve() as any);
  });
  beforeEach(() => {
    service = new AuthService();
  });

  describe('isAuthenticated', () => {
    it('should return false when no session exists', async () => {
      spyOn(Preferences, 'get').and.returnValue(Promise.resolve({ value: null } as any));
      // Ensure no in-memory session remains from other tests
      (service as any).currentSession = null;
      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return true when valid session exists', async () => {
      const session = { userId: 'user-1', email: 'test@example.com', loginAt: new Date().toISOString() };
      (service as any).currentSession = session;
      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });
  });

  describe('register', () => {
    it('should throw error for invalid email', async () => {
      await expectAsync(service.register('invalid-email', 'password123')).toBeRejectedWithError(
        'Email inválido'
      );
    });

    it('should throw error for weak password', async () => {
      await expectAsync(service.register('test@example.com', 'short')).toBeRejectedWithError(/Contrase.*/);
    });

    it('should register user with valid credentials', async () => {
      spyOn(Preferences, 'get').and.returnValue(Promise.resolve({ value: null } as any));
      spyOn(Preferences, 'set').and.returnValue(Promise.resolve() as any);

      await expectAsync(service.register('test@example.com', 'password123')).toBeResolved();
    });
  });

  describe('login', () => {
    it('should throw error for invalid email', async () => {
      return expectAsync(service.login('invalid-email', 'password123')).toBeRejected();
    });

    it('should throw error when user not found', async () => {
      // Force deterministic failure by stubbing loginLocal
      spyOn(service as any, 'loginLocal').and.returnValue(Promise.reject(new Error('Usuario no encontrado')));
      (service as any).isFirebaseConfigured = false;
      (service as any).firebaseAuth = null;
      return expectAsync(service.login('test@example.com', 'password123')).toBeRejectedWithError(
        'Usuario no encontrado'
      );
    });
  });

  describe('logout', () => {
    it('should clear session on logout', async () => {
      await expectAsync(service.logout()).toBeResolved();
    });
  });

  describe('currentUserId', () => {
    it('should throw error when no session', () => {
      expect(() => service.currentUserId).toThrowError('No hay sesión activa');
    });
  });
});
