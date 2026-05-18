'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <Input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Next.js 프로젝트 절대 경로 (예: C:/Users/me/my-project)"
        disabled={isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={isLoading || !path.trim()}>
        {isLoading ? '분석 중...' : '분석'}
      </Button>
    </form>
  );
}
