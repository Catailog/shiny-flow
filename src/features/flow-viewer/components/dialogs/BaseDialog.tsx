'use client';

import { Dialog } from '@/components/ui/dialog';

export function BaseDialog({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {children}
    </Dialog>
  );
}
