'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type CookiesAuthInput = {
  type: 'cookies';
  cookiesJson: string;
};

type FormAuthInput = {
  type: 'form';
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  username: string;
  password: string;
};

type AuthInput = CookiesAuthInput | FormAuthInput;
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
};

export function ProjectInput({ onAnalyze, isLoading }: Props) {
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
        <Button type="submit" disabled={isLoading || !canSubmit}>
          {isLoading ? '분석 중...' : '분석'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={screenshot}
            onChange={(e) => setScreenshot(e.target.checked)}
            disabled={isLoading}
            className="accent-brand-primary"
          />
          <span className="text-muted-foreground">스크린샷 캡처</span>
        </label>
        {screenshot && (
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="대상 서버 URL (예: http://localhost:3001)"
            disabled={isLoading}
            className="w-72 text-sm"
          />
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
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
                placeholder="로그인 URL (예: /login)"
                disabled={isLoading}
                className="col-span-2 text-xs"
              />
              <Input
                value={usernameSelector}
                onChange={(e) => setUsernameSelector(e.target.value)}
                placeholder="아이디 셀렉터 (예: #email)"
                disabled={isLoading}
                className="text-xs"
              />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 / 이메일"
                disabled={isLoading}
                className="text-xs"
              />
              <Input
                value={passwordSelector}
                onChange={(e) => setPasswordSelector(e.target.value)}
                placeholder="비밀번호 셀렉터 (예: #password)"
                disabled={isLoading}
                className="text-xs"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                disabled={isLoading}
                className="text-xs"
              />
              <Input
                value={submitSelector}
                onChange={(e) => setSubmitSelector(e.target.value)}
                placeholder="제출 버튼 셀렉터 (예: button[type=submit])"
                disabled={isLoading}
                className="col-span-2 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </form>
  );
}
