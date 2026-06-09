'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY_ID = 'sf_author_id';
const KEY_NAME = 'sf_author_name';
const KEY_CLI_AUTHOR = 'sf_cli_author';
const KEY_CLI_DEVICE = 'sf_cli_device';
const KEY_DECLINED = 'sf_author_declined';

export type AuthorOptions = {
  author: string | null;
  device: string | null;
};

export type AuthorPreference = {
  authorId: string;
  authorName: string | null;
  options: AuthorOptions;
  needsPick: boolean;
  pick: (choice: 'author' | 'device') => void;
  pickCustom: (name: string) => void;
  dismiss: () => void;
};

export function useAuthorPreference(): AuthorPreference {
  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [options, setOptions] = useState<AuthorOptions>({ author: null, device: null });
  const [declined, setDeclined] = useState(false);

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
    setDeclined(localStorage.getItem(KEY_DECLINED) === 'true');
  }, []);

  const needsPick = !!authorId && !authorName && !declined && !!(options.author || options.device);

  const pick = useCallback(
    (choice: 'author' | 'device') => {
      const name = choice === 'author' ? options.author : options.device;
      if (!name) return;
      localStorage.setItem(KEY_NAME, name);
      setAuthorName(name);
    },
    [options],
  );

  const pickCustom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY_NAME, trimmed);
    setAuthorName(trimmed);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(KEY_DECLINED, 'true');
    setDeclined(true);
  }, []);

  return { authorId, authorName, options, needsPick, pick, pickCustom, dismiss };
}
