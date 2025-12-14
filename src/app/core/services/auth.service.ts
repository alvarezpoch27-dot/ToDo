import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  validateEmail,
  validatePassword,
  pbkdf2Hash,
  verifyPassword,
  generateUUID,
} from '../utils/security.util';
import * as encryptionUtil from '../utils/encryption.util';
import { CipherResult } from '../utils/encryption.util';
import { Logger } from '../utils/logger.util';
import { AuthSession, StoredUser } from '../models';
import { environment } from '../../../environments/environment';

const USERS_KEY = 'tt_users_v2';
const SESSION_KEY = 'tt_session_v2';
const ENCRYPTION_KEY_PREFIX = 'tt_encryption_key_';

/**
 * Servicio de autenticación robusto
 * - Firebase Auth (principal)
 * - Fallback a PBKDF2 local
 * - Cifrado AES-256-GCM
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentSession: AuthSession | null = null;
  private encryptionKey: Uint8Array | null = null;
  private isFirebaseConfigured = false;
  private firebaseAuth: any = null;

  private logger = new Logger('AuthService', environment.debug);

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Inicializar Firebase si está configurado
   */
  private async initializeFirebase(): Promise<void> {
    if (!environment.firebase) {
      this.logger.debug('Firebase no configurado');
      return;
    }

    try {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const authModule = await import('firebase/auth');

      const apps = getApps();
      if (apps.length === 0) {
        initializeApp(environment.firebase);
      }
      this.firebaseAuth = authModule.getAuth(getApp());
      this.isFirebaseConfigured = true;

      // Listen for token updates so we can refresh session token and derived keys
      try {
        authModule.onIdTokenChanged(this.firebaseAuth, async (user: any) => {
          if (!user) {
            this.logger.info('Firebase user signed out (onIdTokenChanged)');
            // Clear local encryption key but keep other user data until logout is explicit
            this.encryptionKey = null;
            return;
          }
          try {
            const token = await user.getIdToken();
            if (this.currentSession) {
              this.currentSession.firebaseToken = token;
              await this.setSession(this.currentSession);
              await this.deriveAndStoreEncryptionKey(token);
            }
          } catch (err) {
            this.logger.debug('Error updating token onIdTokenChanged', err);
          }
        });
      } catch (err) {
        this.logger.debug('onIdTokenChanged listener not attached', err);
      }

      this.logger.info('Firebase inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando Firebase', error);
    }
  }

  // =====================
  // API PÚBLICA
  // =====================

  /**
   * Verificar si hay sesión activa
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.currentSession) {
      return true;
    }

    const session = await this.loadSession();
    if (session) {
      this.currentSession = session;
      await this.loadEncryptionKey();
      return true;
    }

    return false;
  }

  /**
   * Obtener ID del usuario actual
   */
  get currentUserId(): string {
    if (!this.currentSession) {
      throw new Error('No hay sesión activa');
    }
    return this.currentSession.userId;
  }

  /**
   * Obtener email del usuario actual
   */
  get currentEmail(): string {
    if (!this.currentSession) {
      throw new Error('No hay sesión activa');
    }
    return this.currentSession.email;
  }

  /**
   * Registrar nuevo usuario
   * Intenta Firebase primero, fallback a PBKDF2 local
   */
  async register(email: string, password: string): Promise<void> {
    email = email.trim().toLowerCase();

    if (!validateEmail(email)) {
      throw new Error('Email inválido');
    }
    if (!validatePassword(password)) {
      throw new Error('Contraseña debe tener al menos 8 caracteres');
    }

    // Intentar Firebase
    if (this.isFirebaseConfigured && this.firebaseAuth) {
      try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const cred = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
        const user = cred.user;

        const token = await user.getIdToken();
        const session: AuthSession = {
          userId: user.uid,
          email: user.email || email,
          loginAt: new Date().toISOString(),
          firebaseToken: token,
        };

        await this.setSession(session);
        this.currentSession = session;
        await this.deriveAndStoreEncryptionKey(token);

        this.logger.info(`Usuario registrado en Firebase: ${email}`);
        return;
      } catch (error) {
        this.logger.error('Error en Firebase registration', error);
        // Continuar a fallback local
      }
    }

    // Fallback: PBKDF2 local
    await this.registerLocal(email, password);
  }

  /**
   * Iniciar sesión
   */
  async login(email: string, password: string): Promise<void> {
    email = email.trim().toLowerCase();

    if (!validateEmail(email)) {
      throw new Error('Email inválido');
    }
    if (!password) {
      throw new Error('Contraseña requerida');
    }

    // Intentar Firebase
    if (this.isFirebaseConfigured && this.firebaseAuth) {
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const cred = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
        const user = cred.user;

        const token = await user.getIdToken();
        const session: AuthSession = {
          userId: user.uid,
          email: user.email || email,
          loginAt: new Date().toISOString(),
          firebaseToken: token,
        };

        await this.setSession(session);
        this.currentSession = session;
        await this.deriveAndStoreEncryptionKey(token);

        this.logger.info(`Login exitoso en Firebase: ${email}`);
        return;
      } catch (error) {
        this.logger.error('Error en Firebase login', error);
        // Continuar a fallback local
      }
    }

    // Fallback: PBKDF2 local
    await this.loginLocal(email, password);
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      // Firebase logout
      if (this.isFirebaseConfigured && this.firebaseAuth) {
        try {
          const { signOut } = await import('firebase/auth');
          await signOut(this.firebaseAuth);
        } catch {
          // ignore
        }
      }

      // Limpiar sesión local
      await Preferences.remove({ key: SESSION_KEY });
      if (this.currentSession) {
        await Preferences.remove({
          key: ENCRYPTION_KEY_PREFIX + this.currentSession.userId,
        });
      }

      this.currentSession = null;
      this.encryptionKey = null;

      // Disparar evento
      try {
        window.dispatchEvent(new CustomEvent('tt:logout'));
      } catch {
        // ignore
      }

      this.logger.info('Logout exitoso');
    } catch (error) {
      this.logger.error('Error en logout', error);
      throw new Error('Error cerrando sesión');
    }
  }

  /**
   * Obtener ID token para API calls
   */
  async getIdToken(): Promise<string | null> {
    if (this.isFirebaseConfigured && this.firebaseAuth) {
      try {
        const user = this.firebaseAuth.currentUser;
        if (user) {
          // Prefer regular getIdToken (cached) but attempt refresh on failure
          try {
            return await user.getIdToken();
          } catch (e) {
            this.logger.debug('Token cached fail, forcing refresh', e);
            return await user.getIdToken(true);
          }
        }
      } catch (error) {
        this.logger.debug('Error obteniendo Firebase token', error);
      }
    }

    return this.currentSession?.firebaseToken || null;
  }

  /**
   * Obtener clave de cifrado
   */
  getEncryptionKey(): Uint8Array | null {
    return this.encryptionKey;
  }

  // =====================
  // MÉTODOS PRIVADOS
  // =====================

  /**
   * Registrar usuario localmente con PBKDF2
   */
  private async registerLocal(email: string, password: string): Promise<void> {
    const users = await this.loadLocalUsers();

    const exists = users.some((u) => u.email === email);
    if (exists) {
      throw new Error('Este email ya está registrado');
    }

    const { salt, hash, iterations } = await pbkdf2Hash(password);
    const user: StoredUser = {
      id: generateUUID(),
      email,
      passwordHash: hash,
      passwordSalt: salt,
      iterations,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    await Preferences.set({
      key: USERS_KEY,
      value: JSON.stringify(users),
    });

    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      loginAt: new Date().toISOString(),
    };

    await this.setSession(session);
    this.currentSession = session;
    await this.deriveAndStoreEncryptionKey(password);

    this.logger.info(`Usuario registrado localmente: ${email}`);
  }

  /**
   * Login local con PBKDF2
   */
  private async loginLocal(email: string, password: string): Promise<void> {
    const users = await this.loadLocalUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isValid = await verifyPassword(
      password,
      user.passwordHash,
      user.passwordSalt,
      user.iterations
    );

    if (!isValid) {
      throw new Error('Contraseña incorrecta');
    }

    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      loginAt: new Date().toISOString(),
    };

    await this.setSession(session);
    this.currentSession = session;
    await this.deriveAndStoreEncryptionKey(password);

    this.logger.info(`Login exitoso local: ${email}`);
  }

  /**
   * Cargar usuarios locales desde almacenamiento
   */
  private async loadLocalUsers(): Promise<StoredUser[]> {
    const { value } = await Preferences.get({ key: USERS_KEY });
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      this.logger.error('Error parsing local users');
      return [];
    }
  }

  /**
   * Cargar sesión desde almacenamiento
   */
  private async loadSession(): Promise<AuthSession | null> {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (!value) return null;

    try {
      const session = JSON.parse(value) as AuthSession;
      if (!session?.userId || !session?.email) return null;
      return session;
    } catch {
      this.logger.error('Error parsing session');
      return null;
    }
  }

  /**
   * Guardar sesión
   */
  private async setSession(session: AuthSession): Promise<void> {
    await Preferences.set({
      key: SESSION_KEY,
      value: JSON.stringify(session),
    });
  }

  /**
   * Derivar y almacenar clave de cifrado desde token o contraseña
   */
  private async deriveAndStoreEncryptionKey(keySource: string): Promise<void> {
    try {
      const { key, salt } = await encryptionUtil.deriveKey(keySource);
      this.encryptionKey = key;

      if (this.currentSession) {
        // Almacenar salt para recuperar clave más tarde. Para usuarios Firebase
        // se podrá volver a derivar desde el token. Para usuarios locales,
        // la clave queda en memoria hasta que el usuario vuelva a autenticarse.
        await Preferences.set({
          key: ENCRYPTION_KEY_PREFIX + this.currentSession.userId,
          value: salt,
        });
      }
    } catch (error) {
      this.logger.error('Error derivando encryption key', error);
    }
  }

  /**
   * Cargar clave de cifrado almacenada
   */
  private async loadEncryptionKey(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const { value: salt } = await Preferences.get({
        key: ENCRYPTION_KEY_PREFIX + this.currentSession.userId,
      });

      // Prefer derivar desde token (Firebase users). Si es usuario local y
      // no hay token, la clave permanece en memoria y se deberá derivar
      // tras login local.
          if (salt) {
        if (this.currentSession.firebaseToken) {
          const { key } = await encryptionUtil.deriveKey(this.currentSession.firebaseToken, salt);
          this.encryptionKey = key;
        } else {
          this.logger.debug('Salt encontrada pero no hay firebaseToken - clave local requiere re-login');
        }
      }
    } catch (error) {
      this.logger.debug('Error loading encryption key', error);
    }
  }
}
