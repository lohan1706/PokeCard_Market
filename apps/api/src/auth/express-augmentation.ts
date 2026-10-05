import type { AuthenticatedUser } from './auth.types';

// Express types the request in a namespace. Module augmentation has to follow that shape.
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthenticatedUser;
    }
  }
}

export {};
