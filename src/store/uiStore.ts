'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ko';

const SUPPORTED_LOCALES: Locale[] = ['en', 'ko'];

type UIStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'shiny-flow-ui',
      onRehydrateStorage: () => (state) => {
        // 저장된 값이 없는 첫 방문: 브라우저 언어로 초기화
        if (state === undefined && typeof navigator !== 'undefined') {
          const lang = navigator.language.slice(0, 2).toLowerCase();
          const detected: Locale = SUPPORTED_LOCALES.includes(lang as Locale)
            ? (lang as Locale)
            : 'en';
          useUIStore.getState().setLocale(detected);
        }
      },
    },
  ),
);
