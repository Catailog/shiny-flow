'use client';

import Image from 'next/image';

import { DialogContent, DialogTitle } from '@/components/ui/dialog';

import { useT } from '@/hooks/useT';

import { BaseDialog } from './BaseDialog';

export function ScreenshotDialog({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <BaseDialog onClose={onClose}>
      <DialogContent
        className="max-h-[90vh] w-auto max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[90vw]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t.dialog.screenshot(label)}</DialogTitle>
        <Image
          src={src}
          alt={label}
          width={1280}
          height={0}
          style={{ height: 'auto', maxHeight: '90vh', maxWidth: '90vw', width: 'auto' }}
          className="block rounded-lg object-contain"
          unoptimized
        />
      </DialogContent>
    </BaseDialog>
  );
}
