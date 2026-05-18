'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export default function Home() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Button onClick={() => setMessage('Hello, world!')}>Click me</Button>
      {message && <p className="text-lg font-medium">{message}</p>}
    </div>
  );
}
