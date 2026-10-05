'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { buildApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/api-error';
import { hasErrors, validateRegister } from '@/lib/validation';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get('displayName') ?? '');
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const fieldErrors = validateRegister({ email, password, displayName });
    if (hasErrors(fieldErrors)) {
      setError(
        fieldErrors.displayName ??
          fieldErrors.email ??
          fieldErrors.password ??
          'Formulaire invalide',
      );
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(buildApiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError(await readApiError(response));
      return;
    }
    router.push('/login?registered=1');
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-8 space-y-4">
      {error ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Nom affiché
        <input
          name="displayName"
          type="text"
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={80}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        Créer le compte
      </button>
    </form>
  );
}
