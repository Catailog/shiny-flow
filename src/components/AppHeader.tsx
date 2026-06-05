'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

import { ChevronDownIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useT } from '@/hooks/useT';

import { type Locale, useUIStore } from '@/store/uiStore';

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: 'en', flag: 'us', label: 'English' },
  { code: 'ko', flag: 'kr', label: '한국어' },
];

type Props = {
  isCloudMode: boolean;
};

export function AppHeader({ isCloudMode }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const t = useT();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-6">
      <span className="text-sm font-semibold tracking-tight">shiny-flow</span>

      <div className="flex items-center gap-1">
        {/* 언어 선택 */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <span className={`fi fi-${current.flag} text-sm`} />
            {current.code.toUpperCase()}
            <ChevronDownIcon size={12} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                className="cursor-pointer gap-2"
                onClick={() => setLocale(lang.code)}
              >
                <span className={`fi fi-${lang.flag} text-sm`} />
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 다크모드 토글 */}
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                >
                  {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                </Button>
              </span>
            }
          />
          <TooltipContent>{isDark ? t.header.switchToLight : t.header.switchToDark}</TooltipContent>
        </Tooltip>

        {isCloudMode && (
          <>
            <div className="mx-2 h-4 w-px bg-border" />
            {isLoggedIn ? (
              <>
                <span className="text-xs text-muted-foreground">{session.user.name}</span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex">
                        <Button variant="ghost" size="icon" onClick={() => signOut()}>
                          <LogOutIcon size={15} />
                        </Button>
                      </span>
                    }
                  />
                  <TooltipContent>{t.header.logout}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => signIn('github')}>
                {t.header.login}
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
