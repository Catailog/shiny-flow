'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ko';

const SUPPORTED_LOCALES: Locale[] = ['en', 'ko'];

type UIStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  showNodeLabels: boolean;
  toggleNodeLabels: () => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      showNodeLabels: true,
      toggleNodeLabels: () => set((s) => ({ showNodeLabels: !s.showNodeLabels })),
    }),
    {
      name: 'shiny-flow-ui',
      onRehydrateStorage: () => (state) => {
        // First visit with no saved value: initialize from browser language
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
