'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

import { GlobeIcon, LogOutIcon, MoonIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
  isCloudMode: boolean;
};

export function AppHeader({ isCloudMode }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-6">
      <span className="text-sm font-semibold tracking-tight">shiny-flow</span>

      <div className="flex items-center gap-1">
        {/* 언어 토글 — i18n 구현 전 자리만 */}
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <GlobeIcon size={14} />
          EN
        </Button>

        {/* 다크모드 토글 — 구현 전 자리만 */}
        <Button variant="ghost" size="icon">
          <MoonIcon size={15} />
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
