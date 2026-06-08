'use client';

import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadIcon, Loader2Icon, UploadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useT } from '@/hooks/useT';

import { type AnalyzeFormValues, makeAnalyzeSchema } from '../schema/analyze.schema';

export type CookiesAuthInput = {
  type: 'cookies';
  cookiesJson: string;
};

export type ScriptAuthInput = { type: 'script'; scriptPath: string };

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
  eg,
}: {
  label: string;
  onClick: () => void;
  tooltip?: string;
  eg: string;
}) {
  return (
    <InputGroupAddon align="inline-end">
      <ActionButton type="button" variant="ghost" size="xs" onClick={onClick} tooltip={tooltip}>
        ({eg}: <span className="underline">{label}</span>)
      </ActionButton>
    </InputGroupAddon>
  );
}

export const ProjectInput = forwardRef<ProjectInputHandle, Props>(function ProjectInput(
  { onAnalyze, isLoading, onImport, onExport, canExport },
  ref,
) {
  const t = useT();

  const schema = useMemo(
    () =>
      makeAnalyzeSchema({
        pathRequired: t.input.pathRequired,
        serverUrlRequired: t.input.serverUrlRequired,
        cookiesRequired: t.input.cookiesRequired,
        scriptRequired: t.input.scriptRequired,
        scriptExtension: t.input.scriptExtension,
      }),
    [t],
  );

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
    resolver: zodResolver(schema),
    reValidateMode: 'onSubmit',
    defaultValues: {
      path: '',
      screenshot: false,
      baseUrl: '',
      authType: 'none',
      cookiesJson: '',
      scriptPath: 'shiny-flow.auth.js',
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

  useImperativeHandle(ref, () => ({
    validateForCapture: async () => {
      setValue('screenshot', true);
      await trigger();
    },
    getConfig: () => getValues(),
    restoreConfig: (values: AnalyzeFormValues) => {
      reset(values);
    },
  }));

  const [screenshot, authType, baseUrl, scriptPath] = useWatch({
    control,
    name: ['screenshot', 'authType', 'baseUrl', 'scriptPath'],
  });

  const submitHandler = handleSubmit((values) => {
    if (isLoading) return;
    let auth: AuthInput | undefined;
    if (values.screenshot) {
      if (values.authType === 'cookies')
        auth = { type: 'cookies', cookiesJson: values.cookiesJson };
      else if (values.authType === 'script')
        auth = { type: 'script', scriptPath: values.scriptPath.trim() || 'shiny-flow.auth.js' };
    }
    onAnalyze({
      path: values.path.trim(),
      screenshot: values.screenshot,
      baseUrl: values.baseUrl.trim(),
      auth,
    });
  });

  const loadingTip = isLoading ? t.home.analyzeDisabled : undefined;

  return (
    <form onSubmit={submitHandler} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{t.input.projectPath}</span>
        <div className="flex items-center gap-2">
          <Input {...register('path')} aria-invalid={!!errors.path} className="flex-1" />
          {onImport && (
            <ActionButton
              type="button"
              variant="outline"
              size="icon"
              onClick={onImport}
              tooltip={loadingTip}
              label={t.input.importJson}
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
              tooltip={!canExport ? t.input.exportDisabled : undefined}
              label={t.input.exportJson}
            >
              <DownloadIcon size={16} />
            </ActionButton>
          )}
        </div>
        <FieldError message={errors.path?.message} />
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <Controller
            control={control}
            name="screenshot"
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <span className="text-muted-foreground">{t.input.screenshot}</span>
        </label>

        {screenshot && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t.input.serverUrl}</span>
              <InputGroup className="w-full">
                <InputGroupInput
                  {...register('baseUrl')}
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
                    eg={t.input.eg}
                  />
                )}
              </InputGroup>
              <FieldError message={errors.baseUrl?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.input.auth}</span>
                {(['none', 'cookies', 'script'] as const).map((at) => (
                  <ActionButton
                    key={at}
                    type="button"
                    variant={authType === at ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setValue('authType', at)}
                    tooltip={loadingTip}
                  >
                    {at === 'none'
                      ? t.input.authNone
                      : at === 'cookies'
                        ? t.input.authCookies
                        : t.input.authScript}
                  </ActionButton>
                ))}
              </div>

              {authType === 'script' && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t.input.scriptPath}</span>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      {...register('scriptPath')}
                      aria-invalid={!!errors.scriptPath}
                      className="text-sm"
                    />
                    {!scriptPath && (
                      <ExampleFill
                        label="shiny-flow.auth.js"
                        onClick={() =>
                          setValue('scriptPath', 'shiny-flow.auth.js', { shouldValidate: true })
                        }
                        tooltip={loadingTip}
                        eg={t.input.eg}
                      />
                    )}
                  </InputGroup>
                  <FieldError message={errors.scriptPath?.message} />
                  <p className="text-xs text-muted-foreground opacity-60">
                    {t.input.scriptPathHint}
                  </p>
                </div>
              )}

              {authType === 'cookies' && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t.input.cookiesJson}</span>
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
          </>
        )}
      </div>

      <ActionButton type="submit" tooltip={loadingTip} className="w-full">
        {isLoading && <Loader2Icon className="animate-spin" />}
        {isLoading ? t.input.analyzing : t.input.analyze}
      </ActionButton>
    </form>
  );
});
