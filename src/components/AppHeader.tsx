'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  ChevronDownIcon,
  Loader2Icon,
  LogOutIcon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
} from 'lucide-react';

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

import { FLOW_NAME_MAX_LENGTH } from '@/constants/flow';

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: 'en', flag: 'us', label: 'English' },
  { code: 'ko', flag: 'kr', label: '한국어' },
];

type CloudTitleProps = {
  name: string;
  onRename: (newName: string) => Promise<void>;
  focusTrigger?: number;
  disabled?: boolean;
};

type Props = {
  isCloudMode: boolean;
  cloudTitle?: CloudTitleProps;
  pageTitle?: string;
  readOnlyLabel?: string;
  onRefreshCommentAuthors?: () => Promise<void>;
  isAnalyzing?: boolean;
};

function FlowTitle({ name, onRename, focusTrigger, disabled }: CloudTitleProps) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const cancelledRef = useRef(false);

  const startEdit = () => {
    if (disabled) return;
    cancelledRef.current = false;
    setEditValue(name);
    setIsEditing(true);
  };

  useEffect(() => {
    if (!focusTrigger) return;
    cancelledRef.current = false;
    startTransition(() => {
      setEditValue('');
      setIsEditing(true);
    });
  }, [focusTrigger]);

  const confirm = () => {
    if (cancelledRef.current) return;
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed !== name) {
      void onRename(trimmed);
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={editValue}
          placeholder={t.header.titlePlaceholder}
          maxLength={FLOW_NAME_MAX_LENGTH}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={confirm}
          className="h-7 w-52 rounded-sm border-border/70 bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:ring-1"
        />
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {editValue.length}/{FLOW_NAME_MAX_LENGTH}
        </span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={disabled ? 'inline-flex cursor-not-allowed' : 'inline-flex'}>
            <Button
              variant="ghost"
              onClick={startEdit}
              disabled={disabled}
              className="h-7 max-w-[240px] justify-start overflow-hidden px-2 text-sm font-semibold text-foreground"
            >
              <span className="min-w-0 truncate">
                {name || (
                  <span className="font-normal text-muted-foreground">{t.header.untitled}</span>
                )}
              </span>
            </Button>
          </span>
        }
      />
      <TooltipContent>{disabled ? t.home.analyzeDisabled : t.header.renameTitle}</TooltipContent>
    </Tooltip>
  );
}

export function AppHeader({
  isCloudMode,
  cloudTitle,
  pageTitle,
  readOnlyLabel,
  onRefreshCommentAuthors,
  isAnalyzing,
}: Props) {
  const { data: session, update: updateSession } = useSession();
  const isLoggedIn = !!session?.user;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const t = useT();

  const openLoginPopup = async () => {
    const res = await fetch('/api/auth/csrf');
    const { csrfToken } = (await res.json()) as { csrfToken: string };

    const callbackUrl = `${window.location.origin}/auth-popup-done`;
    const popup = window.open('', 'sf_auth_popup', 'width=520,height=640,top=100,left=200');

    if (!popup) {
      void signIn('github');
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signin/github';
    form.target = 'sf_auth_popup';

    const inputs: [string, string][] = [
      ['csrfToken', csrfToken],
      ['callbackUrl', callbackUrl],
    ];
    for (const [name, value] of inputs) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  useEffect(() => {
    if (!isCloudMode) return;
    const channel = new BroadcastChannel('sf_auth_popup');
    channel.onmessage = () => void updateSession();
    return () => channel.close();
  }, [isCloudMode, updateSession]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center">
        {cloudTitle && <FlowTitle {...cloudTitle} />}
        {pageTitle && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm font-semibold">{pageTitle}</span>
            {readOnlyLabel && (
              <span className="text-xs text-muted-foreground">{readOnlyLabel}</span>
            )}
          </div>
        )}
      </div>

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
                {onRefreshCommentAuthors && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className={isAnalyzing ? 'inline-flex cursor-not-allowed' : 'inline-flex'}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isAnalyzing || isRefreshing}
                            onClick={() => {
                              setIsRefreshing(true);
                              void onRefreshCommentAuthors().finally(() => setIsRefreshing(false));
                            }}
                          >
                            {isRefreshing ? (
                              <Loader2Icon size={15} className="animate-spin" />
                            ) : (
                              <RefreshCwIcon size={15} />
                            )}
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>
                      {isAnalyzing ? t.home.analyzeDisabled : t.cloud.refreshAuthors}
                    </TooltipContent>
                  </Tooltip>
                )}
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
              <Button variant="outline" size="sm" onClick={() => void openLoginPopup()}>
                {t.header.login}
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
