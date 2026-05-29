'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronDownIcon,
  DownloadIcon,
  Loader2Icon,
  PinIcon,
  PinOffIcon,
  UploadIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { type AnalyzeFormValues, analyzeSchema } from '../schema/analyze.schema';

export type CookiesAuthInput = {
  type: 'cookies';
  cookiesJson: string;
};

export type ScriptAuthInput = { type: 'script' };

export type AuthInput = CookiesAuthInput | ScriptAuthInput;

export type AnalyzeOptions = {
  path: string;
  screenshot: boolean;
  baseUrl: string;
  auth?: AuthInput;
};

type Props = {
  onAnalyze: (options: AnalyzeOptions) => void;
  isLoading: boolean;
  onImport?: () => void;
  onExport?: () => void;
  canExport?: boolean;
};

export type ProjectInputHandle = {
  validateForCapture: () => Promise<void>;
  getConfig: () => AnalyzeFormValues;
  restoreConfig: (values: AnalyzeFormValues) => void;
};

// 비활성 조건이 충족될 때 tooltip을 보여주고 클릭을 막는 버튼 래퍼
function ActionButton({
  tooltip,
  label,
  onClick,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tooltip?: string; label?: string }) {
  const shownTooltip = tooltip ?? label;

  if (!shownTooltip) {
    return (
      <Button className={className} onClick={onClick} {...props}>
        {children}
      </Button>
    );
  }

  // disabled 이유(tooltip)가 있으면 disabled 처리
  // disabled:pointer-events-none 으로 span이 hover 이벤트를 받아 툴팁이 동작한다
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex cursor-not-allowed">
              <Button disabled className={className} {...props} title={undefined}>
                {children}
              </Button>
            </span>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  // 활성 상태 + shadcn 툴팁 (label이거나 submit의 tooltip)
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <Button className={className} onClick={onClick} {...props} title={undefined}>
              {children}
            </Button>
          </span>
        }
      />
      <TooltipContent>{shownTooltip}</TooltipContent>
    </Tooltip>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ExampleFill({
  label,
  onClick,
  tooltip,
}: {
  label: string;
  onClick: () => void;
  tooltip?: string;
}) {
  return (
    <InputGroupAddon align="inline-end">
      <ActionButton type="button" variant="ghost" size="xs" onClick={onClick} tooltip={tooltip}>
        (예: <span className="underline">{label}</span>)
      </ActionButton>
    </InputGroupAddon>
  );
}

export const ProjectInput = forwardRef<ProjectInputHandle, Props>(function ProjectInput(
  { onAnalyze, isLoading, onImport, onExport, canExport },
  ref,
) {
  const {
    register: _register,
    handleSubmit,
    control,
    setValue,
    trigger,
    getValues,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<AnalyzeFormValues>({
    resolver: zodResolver(analyzeSchema),
    reValidateMode: 'onSubmit',
    defaultValues: {
      path: '',
      screenshot: false,
      baseUrl: '',
      authType: 'none',
      cookiesJson: '',
    },
  });

  const register = (name: Parameters<typeof _register>[0]) => {
    const { onChange, ...rest } = _register(name);
    return {
      ...rest,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        clearErrors(name);
        return onChange(e);
      },
    };
  };

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = pinned || hovered || focused;

  useImperativeHandle(ref, () => ({
    validateForCapture: async () => {
      setPinned(true);
      setValue('screenshot', true);
      await trigger();
    },
    getConfig: () => getValues(),
    restoreConfig: (values: AnalyzeFormValues) => {
      reset(values);
    },
  }));

  const [screenshot, authType, baseUrl] = useWatch({
    control,
    name: ['screenshot', 'authType', 'baseUrl'],
  });

  const submitHandler = handleSubmit((values) => {
    if (isLoading) return;
    let auth: AuthInput | undefined;
    if (values.screenshot) {
      if (values.authType === 'cookies')
        auth = { type: 'cookies', cookiesJson: values.cookiesJson };
      else if (values.authType === 'script') auth = { type: 'script' };
    }
    onAnalyze({
      path: values.path.trim(),
      screenshot: values.screenshot,
      baseUrl: values.baseUrl.trim(),
      auth,
    });
  });

  const loadingTip = isLoading ? '분석 중입니다.' : undefined;

  return (
    <form
      onSubmit={submitHandler}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="flex flex-1 flex-col gap-2"
    >
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">프로젝트 경로</span>
          <Input
            {...register('path')}
            placeholder="Next.js 프로젝트 절대 경로 (예: C:/Users/me/my-project)"
            aria-invalid={!!errors.path}
            className="flex-1"
          />
          <FieldError message={errors.path?.message} />
        </div>
        {onImport && (
          <ActionButton
            type="button"
            variant="outline"
            size="icon"
            onClick={onImport}
            tooltip={loadingTip}
            label="JSON 불러오기"
          >
            <UploadIcon size={16} />
          </ActionButton>
        )}
        {onExport !== undefined && (
          <ActionButton
            type="button"
            variant="outline"
            size="icon"
            onClick={onExport}
            tooltip={!canExport ? '분석된 그래프가 없어 JSON 내보내기가 불가능합니다.' : undefined}
            label="JSON 내보내기"
          >
            <DownloadIcon size={16} />
          </ActionButton>
        )}
        <ActionButton type="submit" tooltip={loadingTip}>
          {isLoading && <Loader2Icon className="animate-spin" />}
          {isLoading ? '분석 중...' : '분석'}
        </ActionButton>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 p-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <Controller
                  control={control}
                  name="screenshot"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-muted-foreground">스크린샷 캡처</span>
              </label>
              {screenshot && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">서버 URL</span>
                  <InputGroup className="w-72">
                    <InputGroupInput
                      {...register('baseUrl')}
                      placeholder="대상 서버 URL"
                      aria-invalid={!!errors.baseUrl}
                      className="text-sm"
                    />
                    {!baseUrl && (
                      <ExampleFill
                        label="http://localhost:3000"
                        onClick={() =>
                          setValue('baseUrl', 'http://localhost:3000', { shouldValidate: true })
                        }
                        tooltip={loadingTip}
                      />
                    )}
                  </InputGroup>
                  <FieldError message={errors.baseUrl?.message} />
                </div>
              )}
            </div>

            {screenshot && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">인증:</span>
                  {(['none', 'cookies', 'script'] as const).map((t) => (
                    <ActionButton
                      key={t}
                      type="button"
                      variant={authType === t ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setValue('authType', t)}
                      tooltip={loadingTip}
                    >
                      {t === 'none' ? '없음' : t === 'cookies' ? '쿠키 주입' : '스크립트'}
                    </ActionButton>
                  ))}
                </div>

                {authType === 'script' && (
                  <p className="text-xs text-muted-foreground">
                    프로젝트 루트의{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">
                      shiny-flow.auth.js
                    </code>
                    를 자동으로 실행합니다.{' '}
                    <span className="opacity-60">
                      파일이 없으면 npx shiny-flow init 으로 생성하세요.
                    </span>
                  </p>
                )}

                {authType === 'cookies' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      쿠키 JSON{' '}
                      <span className="opacity-60">
                        (DevTools › Application › Cookies에서 복사)
                      </span>
                    </span>
                    <Textarea
                      {...register('cookiesJson')}
                      placeholder='[{"name":"session","value":"abc123","domain":"localhost"}]'
                      aria-invalid={!!errors.cookiesJson}
                      className="h-24 font-mono text-xs"
                    />
                    <FieldError message={errors.cookiesJson?.message} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={() => setPinned((p) => !p)}
        className="mx-auto flex h-5 w-5 items-center justify-center p-0 text-muted-foreground/40 hover:text-muted-foreground"
      >
        {pinned ? (
          <PinOffIcon size={13} />
        ) : expanded ? (
          <PinIcon size={13} />
        ) : (
          <ChevronDownIcon size={13} />
        )}
      </Button>
    </form>
  );
});
