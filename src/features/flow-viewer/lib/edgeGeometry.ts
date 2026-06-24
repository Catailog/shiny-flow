import type { Edge, InternalNode } from '@xyflow/react';

export type Face = 'top' | 'bottom' | 'left' | 'right';
export type HandlePlacement = { face: Face; index: number; total: number };
export type LoopAttachment = { rx: number; ry: number };

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

function attachmentToCanvas(node: InternalNode, a: LoopAttachment): { x: number; y: number } {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  return { x: x + a.rx * w, y: y + a.ry * h };
}

export function buildCustomSelfLoopPath(
  node: InternalNode,
  loopSp: LoopAttachment,
  loopTp: LoopAttachment,
  loopCtrl?: { x: number; y: number },
) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const sp = attachmentToCanvas(node, loopSp);
  const tp = attachmentToCanvas(node, loopTp);

  const midX = (sp.x + tp.x) / 2;
  const midY = (sp.y + tp.y) / 2;
  const dx = midX - cx;
  const dy = midY - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const outX = dx / len;
  const outY = dy / len;

  const dist = Math.sqrt((tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2);
  const defaultLen = Math.max(LOOP_BASE_HEIGHT, dist * 1.5);
  // loopCtrl: sp·tp에 동일하게 더해지는 2D 오프셋. 라벨 위치 = midCanvas + 0.75 * ctrl
  const ctrl = loopCtrl ?? { x: outX * defaultLen, y: outY * defaultLen };

  const cp1 = { x: sp.x + ctrl.x, y: sp.y + ctrl.y };
  const cp2 = { x: tp.x + ctrl.x, y: tp.y + ctrl.y };

  // cubic bezier at t=0.5: 0.125*sp + 0.375*cp1 + 0.375*cp2 + 0.125*tp
  // = 0.5*(sp+tp)/2 + 0.75*ctrl = midXY + 0.75*ctrl
  const labelX = midX + 0.75 * ctrl.x;
  const labelY = midY + 0.75 * ctrl.y;

  return {
    path: `M ${sp.x} ${sp.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${tp.x} ${tp.y}`,
    labelX,
    labelY,
    spCanvas: sp,
    tpCanvas: tp,
  };
}

export function snapToNodePerimeter(
  node: InternalNode,
  canvasPos: { x: number; y: number },
): LoopAttachment {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;

  const px = Math.max(x, Math.min(x + w, canvasPos.x));
  const py = Math.max(y, Math.min(y + h, canvasPos.y));

  const dLeft = Math.abs(canvasPos.x - x);
  const dRight = Math.abs(canvasPos.x - (x + w));
  const dTop = Math.abs(canvasPos.y - y);
  const dBottom = Math.abs(canvasPos.y - (y + h));

  const minD = Math.min(dLeft, dRight, dTop, dBottom);

  if (minD === dTop) return { rx: w > 0 ? (px - x) / w : 0.5, ry: 0 };
  if (minD === dBottom) return { rx: w > 0 ? (px - x) / w : 0.5, ry: 1 };
  if (minD === dLeft) return { rx: 0, ry: h > 0 ? (py - y) / h : 0.5 };
  return { rx: 1, ry: h > 0 ? (py - y) / h : 0.5 };
}
