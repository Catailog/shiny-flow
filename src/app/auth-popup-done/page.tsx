'use client';

import { useEffect, useState } from 'react';

export default function AuthPopupDone() {
  const [closing, setClosing] = useState(true);

  useEffect(() => {
    const channel = new BroadcastChannel('sf_auth_popup');
    channel.postMessage({ type: 'auth_complete' });
    channel.close();

    const closed = window.close();
    if (closed === undefined) {
      // window.close() returned undefined (may not have closed in all browsers)
      setTimeout(() => setClosing(false), 500);
    }
  }, []);

  if (!closing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">로그인이 완료됐습니다. 이 창을 닫아주세요.</p>
      </div>
    );
  }

  return null;
}
