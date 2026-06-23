'use client';

import { type Edge, type Node, useReactFlow } from '@xyflow/react';
import { PencilIcon, Trash2Icon, UngroupIcon } from 'lucide-react';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import { getAbsolutePosition, recomputeGroupZIndexes } from '../../lib/nodeUtils';
import type { DialogRequest } from '../../types';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection } from './shared';

type Props = {
  nodeId: string;
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
  selectedNodes: Node[];
  selectedEdges: Edge[];
};

export function GroupNodeMenu({
  nodeId,
  screenX,
  screenY,
  onOpenDialog,
  selectedNodes,
  selectedEdges,
}: Props) {
  const { setNodes, deleteElements, getNode } = useReactFlow();
  const { pushSnapshot } = useHistory();
  const t = useT();

  const group = getNode(nodeId);
  const otherNodesSelected = selectedNodes.some((n) => n.id !== nodeId && n.type === 'groupNode');
  const isMultiSelected = selectedNodes.length + selectedEdges.length >= 2;

  const deleteSelectedItem = isMultiSelected ? (
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
  ) : null;

  const sections: MenuSection[] = [
    [
      !otherNodesSelected ? (
        <MenuItem key="groupEdit" onClick={() => onOpenDialog({ type: 'groupEdit', nodeId })}>
          <PencilIcon className={ICON} />
          {t.menu.editGroup}
        </MenuItem>
      ) : null,
      !otherNodesSelected ? (
        <MenuItem
          key="groupUngroup"
          variant="destructive"
          onClick={() => {
            if (group?.parentId) {
              onOpenDialog({ type: 'groupUngroup', nodeId });
            } else {
              pushSnapshot();
              setNodes((prev) => {
                const result = prev
                  .filter((n) => n.id !== nodeId)
                  .map((n) => {
                    if (n.parentId !== nodeId) return n;
                    const absPos = getAbsolutePosition(n, prev);
                    return { ...n, parentId: undefined, extent: undefined, position: absPos };
                  });
                return recomputeGroupZIndexes(result);
              });
            }
          }}
        >
          <UngroupIcon className={ICON} />
          {t.menu.ungroup}
        </MenuItem>
      ) : null,
    ],
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
    [
      <MenuItem
        key="groupDelete"
        variant="destructive"
        onClick={() => {
          pushSnapshot();
          deleteElements({ nodes: [{ id: nodeId }] });
        }}
      >
        <Trash2Icon className={ICON} />
        {t.menu.deleteGroup}
      </MenuItem>,
      deleteSelectedItem,
    ],
  ];

  return <MenuGroups sections={sections} />;
}
