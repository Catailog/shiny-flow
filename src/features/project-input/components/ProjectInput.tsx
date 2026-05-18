'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  onAnalyze: (path: string) => void;
  isLoading: boolean;
};

export function ProjectInput({ onAnalyze, isLoading }: Props) {
  const [path, setPath] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) onAnalyze(path.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Next.js 프로젝트 절대 경로 (예: C:/Users/me/my-project)"
        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-brand-primary flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !path.trim()}>
        {isLoading ? '분석 중...' : '분석'}
      </Button>
    </form>
  );
}
