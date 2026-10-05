'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { buildApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/api-error';
import { hasErrors, validateLogin } from '@/lib/validation';

export function LoginForm({ registered, nextPath }: { registered: boolean; nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const fieldErrors = validateLogin({ email, password });
    if (hasErrors(fieldErrors)) {
      setError(fieldErrors.email ?? fieldErrors.password ?? 'Formulaire invalide');
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(buildApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setPending(false);
    if (!response.ok) {
      setError(await readApiError(response));
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-8 space-y-4">
      {registered ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Compte créé. Vous pouvez vous connecter.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
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
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        Se connecter
      </button>
    </form>
  );
}
