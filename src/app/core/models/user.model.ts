/**
 * User model - Tipado estricto
 */
export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Sesión de autenticación
 */
export interface AuthSession {
  userId: string;
  email: string;
  loginAt: string;
  firebaseToken?: string;
}

/**
 * Usuario almacenado localmente (solo para fallback sin Firebase)
 */
export interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
}
