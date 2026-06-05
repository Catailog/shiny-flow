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

const LANGUAGES = [
  { code: 'en', flag: 'us', label: 'English' },
  { code: 'ko', flag: 'kr', label: '한국어' },
] as const;

type Lang = (typeof LANGUAGES)[number]['code'];

type Props = {
  isCloudMode: boolean;
};

export function AppHeader({ isCloudMode }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const currentLang: Lang = 'en';
  const current = LANGUAGES.find((l) => l.code === currentLang)!;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-6">
      <span className="text-sm font-semibold tracking-tight">shiny-flow</span>

      <div className="flex items-center gap-1">
        {/* 언어 선택 — i18n 구현 전 자리만 */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <span className={`fi fi-${current.flag} text-sm`} />
            {current.code.toUpperCase()}
            <ChevronDownIcon size={12} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem key={lang.code} className="cursor-pointer gap-2">
                <span className={`fi fi-${lang.flag} text-sm`} />
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 다크모드 토글 */}
        <Button variant="ghost" size="icon" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
          {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </Button>

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
                  <TooltipContent>로그아웃</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => signIn('github')}>
                GitHub 로그인
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
