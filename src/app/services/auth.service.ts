import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { EncryptionService } from './encryption.service';
import { environment } from '../../environments/environment';

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type Session = {
  userId: string;
  email: string;
  loginAt: string;
};

const USERS_KEY = 'tt_users_v1';
const SESSION_KEY = 'tt_session_v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUserId: string | null = null;
  private _currentEmail: string | null = null;
  private usingFirebase = false;

  constructor(private encryption: EncryptionService) {}

  get currentUserId(): string {
    if (!this._currentUserId) throw new Error('No hay sesión activa.');
    return this._currentUserId;
  }

  get currentEmail(): string {
    if (!this._currentEmail) throw new Error('No hay sesión activa.');
    return this._currentEmail;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;
    this._currentUserId = session.userId;
    this._currentEmail = session.email;
    return true;
  }

  async getIdToken(): Promise<string | null> {
    // If Firebase configured, try to get ID token via dynamic import
    if ((environment as any).firebase) {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser as any;
        if (user) return await user.getIdToken();
      } catch {
        // ignore
      }
    }
    return null;
  }

  async register(email: string, password: string): Promise<void> {
    email = email.trim().toLowerCase();
    this.validateEmail(email);
    this.validatePassword(password);

    if ((environment as any).firebase) {
      // Use Firebase Auth
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { initializeApp } = await import('firebase/app');
      initializeApp((environment as any).firebase);
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user as any;
      const token = await user.getIdToken();
      this.usingFirebase = true;
      await this.encryption.setKeyFromToken(token).catch(() => {});
      const session: Session = { userId: user.uid, email, loginAt: new Date().toISOString() };
      await this.setSession(session);
      this._currentUserId = user.uid;
      this._currentEmail = email;
      return;
    }

    // Fallback to local registration
    const users = await this.getUsers();
    const exists = users.some((u) => u.email === email);
    if (exists) throw new Error('Ese email ya está registrado.');

    const user: StoredUser = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await this.sha256(password),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    await Preferences.set({ key: USERS_KEY, value: JSON.stringify(users) });

    await this.setSession({ userId: user.id, email: user.email, loginAt: new Date().toISOString() });
    this._currentUserId = user.id;
    this._currentEmail = user.email;
  }

  async login(email: string, password: string): Promise<void> {
    email = email.trim().toLowerCase();
    this.validateEmail(email);
    if (!password) throw new Error('La contraseña es obligatoria.');

    if ((environment as any).firebase) {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { initializeApp } = await import('firebase/app');
      initializeApp((environment as any).firebase);
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user as any;
      const token = await user.getIdToken();
      this.usingFirebase = true;
      await this.encryption.setKeyFromToken(token).catch(() => {});
      const session: Session = { userId: user.uid, email, loginAt: new Date().toISOString() };
      await this.setSession(session);
      this._currentUserId = user.uid;
      this._currentEmail = email;
      return;
    }

    const users = await this.getUsers();
    const user = users.find((u) => u.email === email);
    if (!user) throw new Error('Usuario no encontrado.');

    const hash = await this.sha256(password);
    if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta.');

    await this.setSession({ userId: user.id, email: user.email, loginAt: new Date().toISOString() });
    this._currentUserId = user.id;
    this._currentEmail = user.email;
  }

  async logout(): Promise<void> {
    // Clear session and encryption key
    await Preferences.remove({ key: SESSION_KEY });
    this._currentUserId = null;
    this._currentEmail = null;
    try {
      this.encryption.clearKey();
    } catch {}

    if (this.usingFirebase && (environment as any).firebase) {
      try {
        const { getAuth, signOut } = await import('firebase/auth');
        const auth = getAuth();
        await signOut(auth);
      } catch {}
    }

    try {
      window.dispatchEvent(new CustomEvent('tt:logout'));
    } catch {
      // ignore
    }
  }

  // --------- Internos ---------

  private async getUsers(): Promise<StoredUser[]> {
    const { value } = await Preferences.get({ key: USERS_KEY });
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed as StoredUser[];
    } catch {
      return [];
    }
  }

  private async getSession(): Promise<Session | null> {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (!value) return null;
    try {
      // try decrypt if encryption available
      let raw = value;
      try {
        const dec = await this.encryption.maybeDecryptString(value);
        if (dec) raw = dec;
      } catch {}
      const s = JSON.parse(raw) as Session;
      if (!s?.userId || !s?.email) return null;
      return s;
    } catch {
      return null;
    }
  }

  private async setSession(session: Session): Promise<void> {
    try {
      // if encryption key available, encrypt session
      if ((this.encryption as any)?.maybeDecryptString) {
        const token = await this.getIdToken();
        if (token) {
          await this.encryption.setKeyFromToken(token).catch(() => {});
          const enc = await this.encryption.encryptString(JSON.stringify(session));
          await Preferences.set({ key: SESSION_KEY, value: enc });
          return;
        }
      }
    } catch {}
    await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
  }

  private validateEmail(email: string): void {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) throw new Error('Email inválido.');
  }

  private validatePassword(password: string): void {
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  private async sha256(text: string): Promise<string> {
    const enc = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
