'use client';

import { useRef, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useT } from '@/hooks/useT';

import { type Locale, useUIStore } from '@/store/uiStore';

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: 'en', flag: 'us', label: 'English' },
  { code: 'ko', flag: 'kr', label: '한국어' },
];

type CloudTitleProps = {
  name: string;
  onRename: (newName: string) => Promise<void>;
};

type Props = {
  isCloudMode: boolean;
  cloudTitle?: CloudTitleProps;
};

function FlowTitle({ name, onRename }: CloudTitleProps) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const cancelledRef = useRef(false);

  const startEdit = () => {
    cancelledRef.current = false;
    setEditValue(name);
    setIsEditing(true);
  };

  const confirm = () => {
    if (cancelledRef.current) return;
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== name) {
      void onRename(trimmed);
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm();
          if (e.key === 'Escape') cancel();
        }}
        onBlur={confirm}
        className="h-7 w-52 rounded-sm border-border/70 bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:ring-1"
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button
              variant="ghost"
              onClick={startEdit}
              className="h-7 max-w-[240px] truncate px-2 text-sm font-semibold text-foreground"
            >
              {name || (
                <span className="font-normal text-muted-foreground">{t.header.untitled}</span>
              )}
            </Button>
          </span>
        }
      />
      <TooltipContent>{t.header.renameTitle}</TooltipContent>
    </Tooltip>
  );
}

export function AppHeader({ isCloudMode, cloudTitle }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const t = useT();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center">{cloudTitle && <FlowTitle {...cloudTitle} />}</div>

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
