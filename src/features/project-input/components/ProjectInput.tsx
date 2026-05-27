'use client';

import { useState } from 'react';

import { DownloadIcon, Loader2Icon, UploadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';

export type CookiesAuthInput = {
  type: 'cookies';
  cookiesJson: string;
};

export type FormAuthInput = {
  type: 'form';
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  username: string;
  password: string;
};

export type AuthInput = CookiesAuthInput | FormAuthInput;
type AuthType = 'none' | 'cookies' | 'form';

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

export function ProjectInput({ onAnalyze, isLoading, onImport, onExport, canExport }: Props) {
  const [path, setPath] = useState('');
  const [screenshot, setScreenshot] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState<AuthType>('none');

  const [cookiesJson, setCookiesJson] = useState('');

  const [loginUrl, setLoginUrl] = useState('');
  const [usernameSelector, setUsernameSelector] = useState('');
  const [passwordSelector, setPasswordSelector] = useState('');
  const [submitSelector, setSubmitSelector] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const buildAuth = (): AuthInput | undefined => {
    if (authType === 'cookies') return { type: 'cookies', cookiesJson };
    if (authType === 'form')
      return {
        type: 'form',
        loginUrl,
        usernameSelector,
        passwordSelector,
        submitSelector,
        username,
        password,
      };
  };

  const authValid =
    authType === 'none' ||
    (authType === 'cookies' && cookiesJson.trim() !== '') ||
    (authType === 'form' &&
      loginUrl &&
      usernameSelector &&
      passwordSelector &&
      submitSelector &&
      username &&
      password);

  const canSubmit = path.trim() && (!screenshot || baseUrl.trim()) && authValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAnalyze({
      path: path.trim(),
      screenshot,
      baseUrl: baseUrl.trim(),
      auth: screenshot ? buildAuth() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Next.js 프로젝트 절대 경로 (예: C:/Users/me/my-project)"
          disabled={isLoading}
          className="flex-1"
        />
        {onImport && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onImport}
            disabled={isLoading}
            title="JSON 불러오기"
          >
            <UploadIcon size={16} />
          </Button>
        )}
        {onExport !== undefined && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onExport}
            disabled={!canExport}
            title="JSON 내보내기"
          >
            <DownloadIcon size={16} />
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !canSubmit}>
          {isLoading && <Loader2Icon className="animate-spin" />}
          {isLoading ? '분석 중...' : '분석'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <Checkbox
            checked={screenshot}
            onCheckedChange={(checked) => setScreenshot(checked === true)}
            disabled={isLoading}
          />
          <span className="text-muted-foreground">스크린샷 캡처</span>
        </label>
        {screenshot && (
          <InputGroup className="w-72">
            <InputGroupInput
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="대상 서버 URL"
              disabled={isLoading}
              className="text-sm"
            />
            {!baseUrl && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setBaseUrl('http://localhost:3000')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  (예: <span className="underline">http://localhost:3000</span>)
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        )}
      </div>

      {screenshot && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">인증:</span>
            {(['none', 'cookies', 'form'] as AuthType[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={authType === t ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setAuthType(t)}
                disabled={isLoading}
              >
                {t === 'none' ? '없음' : t === 'cookies' ? '쿠키 주입' : 'Form 로그인'}
              </Button>
            ))}
          </div>

          {authType === 'cookies' && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                DevTools → Application → Cookies에서 복사한 JSON 배열 붙여넣기
              </span>
              <Textarea
                value={cookiesJson}
                onChange={(e) => setCookiesJson(e.target.value)}
                placeholder='[{"name":"session","value":"abc123","domain":"localhost"}]'
                disabled={isLoading}
                className="h-24 font-mono text-xs"
              />
            </div>
          )}

          {authType === 'form' && (
            <div className="flex flex-col gap-1.5">
              <InputGroup>
                <InputGroupInput
                  value={loginUrl}
                  onChange={(e) => setLoginUrl(e.target.value)}
                  placeholder="로그인 URL"
                  disabled={isLoading}
                  className="text-sm"
                />
                {!loginUrl && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      onClick={() => setLoginUrl('/login')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      (예: <span className="underline">/login</span>)
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>

              <div className="flex gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupInput
                    value={usernameSelector}
                    onChange={(e) => setUsernameSelector(e.target.value)}
                    placeholder="아이디 셀렉터"
                    disabled={isLoading}
                    className="text-sm"
                  />
                  {!usernameSelector && (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setUsernameSelector('#email')}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        (예: <span className="underline">#email</span>)
                      </InputGroupButton>
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디 / 이메일"
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
              </div>

              <div className="flex gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupInput
                    value={passwordSelector}
                    onChange={(e) => setPasswordSelector(e.target.value)}
                    placeholder="비밀번호 셀렉터"
                    disabled={isLoading}
                    className="text-sm"
                  />
                  {!passwordSelector && (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setPasswordSelector('#password')}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        (예: <span className="underline">#password</span>)
                      </InputGroupButton>
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
              </div>

              <InputGroup>
                <InputGroupInput
                  value={submitSelector}
                  onChange={(e) => setSubmitSelector(e.target.value)}
                  placeholder="제출 버튼 셀렉터"
                  disabled={isLoading}
                  className="text-sm"
                />
                {!submitSelector && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      onClick={() => setSubmitSelector('button[type=submit]')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      (예: <span className="underline">button[type=submit]</span>)
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
