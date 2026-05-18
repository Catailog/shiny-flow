'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AnalyzeOptions = {
  path: string;
  screenshot: boolean;
  baseUrl: string;
};

type Props = {
  onAnalyze: (options: AnalyzeOptions) => void;
  isLoading: boolean;
};

export function ProjectInput({ onAnalyze, isLoading }: Props) {
  const [path, setPath] = useState('');
  const [screenshot, setScreenshot] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const canSubmit = path.trim() && (!screenshot || baseUrl.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onAnalyze({ path: path.trim(), screenshot, baseUrl: baseUrl.trim() });
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

      <div className="flex items-center gap-3">
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
    </form>
  );
}
