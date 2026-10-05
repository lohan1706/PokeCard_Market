export type AuthFieldErrors = {
  email?: string;
  password?: string;
  displayName?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export function validateLogin(input: { email: string; password: string }): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Adresse e-mail invalide';
  }
  if (input.password.length < 1) {
    errors.password = 'Le mot de passe est requis';
  } else if (input.password.length > 128) {
    errors.password = 'Le mot de passe ne peut pas dépasser 128 caractères';
  }
  return errors;
}

export function validateRegister(input: {
  email: string;
  password: string;
  displayName: string;
}): AuthFieldErrors {
  const errors = validateLogin(input);
  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    errors.displayName = 'Le nom affiché doit contenir au moins 2 caractères';
  } else if (displayName.length > 80) {
    errors.displayName = 'Le nom affiché ne peut pas dépasser 80 caractères';
  }
  if (!errors.password && input.password.length < 10) {
    errors.password = 'Le mot de passe doit contenir au moins 10 caractères';
  } else if (!errors.password && !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(input.password)) {
    errors.password = 'Le mot de passe doit contenir une lettre et un chiffre';
  }
  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Boolean(errors.email || errors.password || errors.displayName);
}
