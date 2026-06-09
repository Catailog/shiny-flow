'use client';

import { useCallback, useEffect, useState } from 'react';

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

export function useAuthorPreference(): AuthorPreference {
  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [options, setOptions] = useState<AuthorOptions>({ author: null, device: null });

  useEffect(() => {
    let id = localStorage.getItem(KEY_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY_ID, id);
    }
    setAuthorId(id);
    setAuthorName(localStorage.getItem(KEY_NAME));
    setOptions({
      author: localStorage.getItem(KEY_CLI_AUTHOR),
      device: localStorage.getItem(KEY_CLI_DEVICE),
    });
  }, []);

  const setName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY_NAME, trimmed);
    setAuthorName(trimmed);
  }, []);

  return { authorId, authorName, options, setName };
}
