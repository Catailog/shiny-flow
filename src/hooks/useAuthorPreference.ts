'use client';

import { useCallback, useState } from 'react';

const KEY_ID = 'sf_author_id';
const KEY_NAME = 'sf_author_name';
const KEY_CLI_AUTHOR = 'sf_cli_author';
const KEY_CLI_DEVICE = 'sf_cli_device';

export type AuthorOptions = {
  author: string | null;
  device: string | null;
};

export type AuthorPreference = {
  authorId: string;
  authorName: string | null;
  options: AuthorOptions;
  setName: (name: string) => void;
};

function readAuthorId(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(KEY_ID);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY_ID, id);
  return id;
}

export function useAuthorPreference(): AuthorPreference {
  const [authorId] = useState(readAuthorId);
  const [authorName, setAuthorName] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(KEY_NAME),
  );
  const [options] = useState<AuthorOptions>(() =>
    typeof window === 'undefined'
      ? { author: null, device: null }
      : {
          author: localStorage.getItem(KEY_CLI_AUTHOR),
          device: localStorage.getItem(KEY_CLI_DEVICE),
        },
  );

  const setName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY_NAME, trimmed);
    setAuthorName(trimmed);
  }, []);

  return { authorId, authorName, options, setName };
}
