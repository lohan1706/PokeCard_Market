import type { RoleCode } from './auth.constants';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  role: RoleCode;
};

export type RequestContext = {
  userAgent?: string;
  ip?: string;
};
