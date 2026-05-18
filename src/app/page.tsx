'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export default function Home() {
  const [message, setMessage] = useState('');

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-brand-dark text-3xl font-semibold tracking-tight">shiny-flow</h1>
      <p className="text-muted-foreground text-sm">User Flow Visualizer</p>
      <Button onClick={() => setMessage('Hello, world!')}>Click me</Button>
      {message && <p className="text-brand-accent text-lg font-medium">{message}</p>}
    </div>
  );
}
