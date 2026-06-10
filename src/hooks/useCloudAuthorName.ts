'use client';

import { useEffect, useState } from 'react';

const resolved = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function fetchAuthorName(accountId: string): Promise<string | null> {
  const existing = inflight.get(accountId);
  if (existing) return existing;

  const promise = fetch(`/api/users/${accountId}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { name: string | null } | null) => d?.name ?? null)
    .catch(() => null)
    .then((name) => {
      resolved.set(accountId, name);
      inflight.delete(accountId);
      return name;
    });

  inflight.set(accountId, promise);
  return promise;
}

export function useCloudAuthorName(accountId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(() =>
    accountId ? (resolved.get(accountId) ?? null) : null,
  );

  useEffect(() => {
    if (!accountId) return;
    if (resolved.has(accountId)) {
      setName(resolved.get(accountId) ?? null);
      return;
    }
    fetchAuthorName(accountId).then(setName);
  }, [accountId]);

  return name;
}
