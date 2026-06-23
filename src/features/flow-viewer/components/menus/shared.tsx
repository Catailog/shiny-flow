'use client';

import { Fragment } from 'react';

import { useReactFlow } from '@xyflow/react';
import { MessageSquarePlusIcon } from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';

export const ICON = 'size-3.5 shrink-0';

export type MenuSection = (React.ReactNode | null | false)[];

export const MenuItem = (props: React.ComponentProps<typeof ContextMenuItem>) => (
  <ContextMenuItem {...props} className={cn('cursor-pointer', props.className)} />
);

export const SubTrigger = (props: React.ComponentProps<typeof ContextMenuSubTrigger>) => (
  <ContextMenuSubTrigger {...props} className={cn('cursor-pointer', props.className)} />
);

export function MenuGroups({ sections }: { sections: MenuSection[] }) {
  const nonEmpty = sections.filter((s) => s.some((x) => !!x));
  return (
    <>
      {nonEmpty.map((section, i) => (
        <Fragment key={i}>
          {i > 0 && <ContextMenuSeparator />}
          {section}
        </Fragment>
      ))}
    </>
  );
}

export function AddCommentItem({ screenX, screenY }: { screenX: number; screenY: number }) {
  const { pushSnapshot } = useHistory();
  const { screenToFlowPosition, setNodes } = useReactFlow();
  const t = useT();
  return (
    <MenuItem
      onClick={() => {
        pushSnapshot();
        const pos = screenToFlowPosition({ x: screenX, y: screenY });
        setNodes((prev) => [
          ...prev,
          {
            id: `comment-${Date.now()}`,
            type: 'commentNode',
            position: pos,
            data: { content: '' },
          },
        ]);
      }}
    >
      <MessageSquarePlusIcon className={ICON} />
      {t.menu.addComment}
    </MenuItem>
  );
}
