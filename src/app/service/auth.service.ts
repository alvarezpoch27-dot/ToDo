import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

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

  async register(email: string, password: string): Promise<void> {
    email = email.trim().toLowerCase();
    this.validateEmail(email);
    this.validatePassword(password);

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
    await Preferences.remove({ key: SESSION_KEY });
    this._currentUserId = null;
    this._currentEmail = null;
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
      const s = JSON.parse(value) as Session;
      if (!s?.userId || !s?.email) return null;
      return s;
    } catch {
      return null;
    }
  }

  private async setSession(session: Session): Promise<void> {
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
