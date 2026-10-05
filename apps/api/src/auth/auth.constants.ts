export const SESSION_COOKIE_NAME = 'pcm_session';
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const INVALID_CREDENTIALS = 'Identifiants invalides';
export const AUTH_REQUIRED = 'Authentification requise';
export const ACCESS_DENIED = 'Accès refusé';
export const EMAIL_TAKEN = 'Un compte existe déjà avec cette adresse e-mail';

export const ROLES = ['USER', 'ADMIN'] as const;
export type RoleCode = (typeof ROLES)[number];
