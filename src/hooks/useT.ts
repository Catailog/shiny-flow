import { en } from '@/locales/en';
import { ko } from '@/locales/ko';

import { useUIStore } from '@/store/uiStore';

export function useT() {
  const locale = useUIStore((s) => s.locale);
  return locale === 'ko' ? ko : en;
}
