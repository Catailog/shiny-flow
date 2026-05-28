import type { Edge, InternalNode } from '@xyflow/react';

export type Face = 'top' | 'bottom' | 'left' | 'right';
export type HandlePlacement = { face: Face; index: number; total: number };

export const LOOP_BASE_HEIGHT = 80;
export const LOOP_BASE_SPREAD = 48;

export function getCenter(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  return { x: x + w / 2, y: y + h / 2 };
}

export function getFace(node: InternalNode, otherCenter: { x: number; y: number }): Face {
  const w = node.measured?.width ?? 1;
  const h = node.measured?.height ?? 1;
  const c = getCenter(node);
  const dx = otherCenter.x - c.x;
  const dy = otherCenter.y - c.y;
  const scaleX = Math.abs(dx) > 0.001 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? h / 2 / Math.abs(dy) : Infinity;
  if (scaleX <= scaleY) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

// 변 위에서 n+2개 등간격 중 i+1번째 위치 (꼭지점 제외, space-between)
export function faceHandlePos(
  node: InternalNode,
  face: Face,
  index: number,
  total: number,
): { x: number; y: number } {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const t = (index + 1) / (total + 1);
  switch (face) {
    case 'top':
      return { x: x + w * t, y };
    case 'bottom':
      return { x: x + w * t, y: y + h };
    case 'left':
      return { x, y: y + h * t };
    case 'right':
      return { x: x + w, y: y + h * t };
  }
}

export function computeHandlePlacement(
  thisNodeId: string,
  edgeId: string,
  allEdges: readonly Edge[],
  nodeLookup: Map<string, InternalNode>,
): HandlePlacement {
  const thisNode = nodeLookup.get(thisNodeId);
  if (!thisNode) return { face: 'bottom', index: 0, total: 1 };

  type Entry = { id: string; face: Face; sortKey: number };
  const entries: Entry[] = [];

  for (const e of allEdges) {
    if (e.source === e.target) continue;
    const otherNodeId =
      e.source === thisNodeId ? e.target : e.target === thisNodeId ? e.source : undefined;
    if (!otherNodeId) continue;
    const otherNode = nodeLookup.get(otherNodeId);
    if (!otherNode) continue;
    const oc = getCenter(otherNode);
    const face = getFace(thisNode, oc);
    // 같은 변 안에서 정렬 기준: 수직 변은 Y, 수평 변은 X
    const sortKey = face === 'left' || face === 'right' ? oc.y : oc.x;
    entries.push({ id: e.id, face, sortKey });
  }

  const thisEntry = entries.find((e) => e.id === edgeId);
  if (!thisEntry) return { face: 'bottom', index: 0, total: 1 };

  const sameFace = entries
    .filter((e) => e.face === thisEntry.face)
    .sort((a, b) => {
      const diff = a.sortKey - b.sortKey;
      // sortKey가 같을 때(같은 타겟 노드) id로 안정 정렬
      if (Math.abs(diff) < 0.5) return a.id < b.id ? -1 : 1;
      return diff;
    });

  const index = sameFace.findIndex((e) => e.id === edgeId);
  return { face: thisEntry.face, index: Math.max(0, index), total: sameFace.length };
}

export function getRectIntersectionFromDir(node: InternalNode, dir: { dx: number; dy: number }) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const { dx, dy } = dir;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
  const scaleX = Math.abs(dx) > 0.001 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? h / 2 / Math.abs(dy) : Infinity;
  return { x: cx + dx * Math.min(scaleX, scaleY), y: cy + dy * Math.min(scaleX, scaleY) };
}

export function buildSelfLoopPath(node: InternalNode, loopIndex: number) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const cx = x + w / 2;
  const topY = y;
  const spread = LOOP_BASE_SPREAD + loopIndex * 24;
  const height = LOOP_BASE_HEIGHT + loopIndex * 32;
  return {
    path: `M ${cx - spread / 3} ${topY} C ${cx - spread} ${topY - height} ${cx + spread} ${topY - height} ${cx + spread / 3} ${topY}`,
    labelX: cx,
    labelY: topY - height * 0.82,
    sp: { x: cx - spread / 3, y: topY },
    tp: { x: cx + spread / 3, y: topY },
  };
}
