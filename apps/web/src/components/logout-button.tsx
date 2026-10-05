'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buildApiUrl } from '@/lib/api';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch(buildApiUrl('/auth/logout'), { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => {
        void logout();
      }}
      disabled={pending}
      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
    >
      Se déconnecter
    </button>
  );
}
