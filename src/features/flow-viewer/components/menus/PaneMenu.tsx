'use client';

import { useReactFlow } from '@xyflow/react';
import { PlusIcon } from 'lucide-react';

import { useT } from '@/hooks/useT';

import type { DialogRequest } from '../../types';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection } from './shared';

type Props = {
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
};

export function PaneMenu({ screenX, screenY, onOpenDialog }: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const t = useT();

  const sections: MenuSection[] = [
    [
      <MenuItem
        key="nodeCreate"
        onClick={() =>
          onOpenDialog({
            type: 'nodeCreate',
            pos: screenToFlowPosition({ x: screenX, y: screenY }),
          })
        }
      >
        <PlusIcon className={ICON} />
        {t.menu.createNode}
      </MenuItem>,
    ],
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
  ];

  return <MenuGroups sections={sections} />;
}
