'use client';

import { type Edge, type Node, useReactFlow } from '@xyflow/react';
import { BoxSelectIcon, Trash2Icon } from 'lucide-react';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import type { DialogRequest } from '../../types';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection } from './shared';

type Props = {
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
  selectedNodes: Node[];
  selectedEdges: Edge[];
};

export function GroupSelectMenu({
  screenX,
  screenY,
  onOpenDialog,
  selectedNodes,
  selectedEdges,
}: Props) {
  const { deleteElements } = useReactFlow();
  const { pushSnapshot } = useHistory();
  const t = useT();

  const isMultiSelected = selectedNodes.length + selectedEdges.length >= 2;

  const sections: MenuSection[] = [
    [
      <MenuItem
        key="groupCreate"
        onClick={() => onOpenDialog({ type: 'groupCreate', nodes: selectedNodes })}
      >
        <BoxSelectIcon className={ICON} />
        {t.menu.createGroup}
      </MenuItem>,
    ],
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
    [
      isMultiSelected ? (
        <MenuItem
          key="deleteSelected"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            deleteElements({ nodes: selectedNodes, edges: selectedEdges });
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteSelected}
        </MenuItem>
      ) : null,
    ],
  ];

  return <MenuGroups sections={sections} />;
}
