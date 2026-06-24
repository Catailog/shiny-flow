'use client';

import { useReactFlow } from '@xyflow/react';
import { PencilIcon, Trash2Icon } from 'lucide-react';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import type { DialogRequest } from '../../types';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection } from './shared';

type Props = {
  nodeId: string;
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
};

export function CommentNodeMenu({ nodeId, screenX, screenY, onOpenDialog }: Props) {
  const { deleteElements } = useReactFlow();
  const { pushSnapshot } = useHistory();
  const t = useT();

  const sections: MenuSection[] = [
    [
      <MenuItem key="edit" onClick={() => onOpenDialog({ type: 'comment', nodeId })}>
        <PencilIcon className={ICON} />
        {t.menu.editComment}
      </MenuItem>,
    ],
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
    [
      <MenuItem
        key="delete"
        variant="destructive"
        onClick={() => {
          pushSnapshot();
          deleteElements({ nodes: [{ id: nodeId }] });
        }}
      >
        <Trash2Icon className={ICON} />
        {t.menu.deleteComment}
      </MenuItem>,
    ],
  ];

  return <MenuGroups sections={sections} />;
}
