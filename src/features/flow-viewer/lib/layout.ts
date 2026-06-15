import type { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';

import { Z_INDEX } from '@/constants/zIndex';

import type { GroupNodeData } from '../types';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 600; // 스크린샷 있는 노드 추정 높이
const NODE_HEIGHT_SMALL = 80; // 스크린샷 없는 노드 추정 높이
export const GROUP_Z_INDEX = Z_INDEX.groupNode;

const GROUP_PADDING = 40;

function nodeSize(node: Node) {
  const hasScreenshot = !!(node.data as { screenshot?: string })?.screenshot;
  const defaultHeight = hasScreenshot ? NODE_HEIGHT : NODE_HEIGHT_SMALL;
  return {
    width: node.measured?.width ?? NODE_WIDTH,
    height: node.measured?.height ?? defaultHeight,
  };
}

function layoutGroupInternally(
  members: Node[],
  allEdges: Edge[],
): { width: number; height: number; positions: Map<string, { x: number; y: number }> } {
  const memberIds = new Set(members.map((m) => m.id));
  const internalEdges = allEdges.filter((e) => memberIds.has(e.source) && memberIds.has(e.target));

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  for (const node of members) {
    const { width, height } = nodeSize(node);
    graph.setNode(node.id, { width, height });
  }
  for (const edge of internalEdges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const raw = new Map<string, { x: number; y: number }>();
  for (const node of members) {
    const dn = graph.node(node.id);
    if (!dn) continue;
    const { width, height } = nodeSize(node);
    const x = dn.x - width / 2;
    const y = dn.y - height / 2;
    raw.set(node.id, { x, y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  // (0, 0) 기준 정규화
  const positions = new Map<string, { x: number; y: number }>();
  for (const [id, pos] of raw) {
    positions.set(id, { x: pos.x - minX, y: pos.y - minY });
  }

  return {
    width: maxX - minX + GROUP_PADDING * 2,
    height: maxY - minY + GROUP_PADDING * 2,
    positions,
  };
}

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  // layoutGroupId별 그룹 멤버 분류
  const groupMemberMap = new Map<string, Node[]>();
  for (const node of nodes) {
    const gid = (node.data as { layoutGroupId?: string })?.layoutGroupId;
    if (!gid) continue;
    if (!groupMemberMap.has(gid)) groupMemberMap.set(gid, []);
    groupMemberMap.get(gid)!.push(node);
  }

  // 그룹 내부를 dagre로 레이아웃하여 크기와 내부 위치를 사전 계산
  type GroupLayout = {
    width: number;
    height: number;
    positions: Map<string, { x: number; y: number }>;
  };
  const groupLayouts = new Map<string, GroupLayout>();
  for (const [gid, members] of groupMemberMap) {
    if (members.length < 2) continue;
    groupLayouts.set(gid, layoutGroupInternally(members, edges));
  }

  // dagre에서 제외할 노드 ID (그룹 멤버, 기존 groupNode 컨테이너)
  const groupedIds = new Set([...groupMemberMap.values()].flatMap((ms) => ms.map((m) => m.id)));
  const existingGroupIds = new Set(nodes.filter((n) => n.type === 'groupNode').map((n) => n.id));

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  // 비그룹 노드를 dagre에 추가
  for (const node of nodes) {
    if (groupedIds.has(node.id) || existingGroupIds.has(node.id)) continue;
    const { width, height } = nodeSize(node);
    graph.setNode(node.id, { width, height });
  }

  // 그룹을 하나의 가상 노드로 dagre에 추가
  for (const [gid, layout] of groupLayouts) {
    graph.setNode(gid, { width: layout.width, height: layout.height });
  }

  // 엣지: 그룹 멤버로 이어지는 엣지는 가상 그룹 노드로 변환
  const nodeGroupMap = new Map<string, string>();
  for (const [gid, members] of groupMemberMap) {
    for (const m of members) nodeGroupMap.set(m.id, gid);
  }

  const addedEdges = new Set<string>();
  for (const edge of edges) {
    const srcGid = nodeGroupMap.get(edge.source);
    const tgtGid = nodeGroupMap.get(edge.target);
    const srcId = srcGid && groupLayouts.has(srcGid) ? srcGid : edge.source;
    const tgtId = tgtGid && groupLayouts.has(tgtGid) ? tgtGid : edge.target;
    if (srcId === tgtId) continue; // 그룹 내부 엣지 제외
    if (!graph.hasNode(srcId) || !graph.hasNode(tgtId)) continue;
    const key = `${srcId}->${tgtId}`;
    if (addedEdges.has(key)) continue;
    addedEdges.add(key);
    graph.setEdge(srcId, tgtId);
  }

  dagre.layout(graph);

  // dagre 결과로 각 노드 위치 결정
  const positioned = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (groupedIds.has(node.id) || existingGroupIds.has(node.id)) continue;
    const dagreNode = graph.node(node.id);
    if (!dagreNode) continue;
    const { width, height } = nodeSize(node);
    positioned.set(node.id, { x: dagreNode.x - width / 2, y: dagreNode.y - height / 2 });
  }

  // 가상 그룹 노드 위치에 내부 dagre 결과를 적용
  for (const [gid, layout] of groupLayouts) {
    const dagreNode = graph.node(gid);
    if (!dagreNode) continue;
    const gx = dagreNode.x - layout.width / 2;
    const gy = dagreNode.y - layout.height / 2;
    for (const [memberId, relPos] of layout.positions) {
      positioned.set(memberId, {
        x: gx + GROUP_PADDING + relPos.x,
        y: gy + GROUP_PADDING + relPos.y,
      });
    }
  }

  // 기존 groupNode 컨테이너 제외 (applyGroupLayout이 재생성)
  const flat = nodes
    .filter((n) => !existingGroupIds.has(n.id))
    .map((node): Node => {
      const pos = positioned.get(node.id);
      return pos ? { ...node, position: pos } : { ...node };
    });

  return applyGroupLayout(separateComponents(flat, edges));
}

const COMPONENT_GAP = 120;

function separateComponents(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length <= 1) return nodes;

  // 같은 layoutGroupId 노드들을 가상 엣지로 연결 — 엣지 없어도 한 컴포넌트로 취급
  const groupMembers = new Map<string, string[]>();
  for (const n of nodes) {
    const gid = (n.data as { layoutGroupId?: string })?.layoutGroupId;
    if (!gid) continue;
    if (!groupMembers.has(gid)) groupMembers.set(gid, []);
    groupMembers.get(gid)!.push(n.id);
  }
  const virtualEdges: Edge[] = [];
  for (const members of groupMembers.values()) {
    for (let i = 1; i < members.length; i++) {
      virtualEdges.push({ id: `__ve-${i}`, source: members[0], target: members[i] } as Edge);
    }
  }

  // 무방향 인접 리스트 구성 (실제 엣지 + 가상 엣지)
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of [...edges, ...virtualEdges]) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }

  // BFS로 connected component 탐색
  const visited = new Set<string>();
  const components: Set<string>[] = [];
  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const component = new Set<string>();
    const queue = [n.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      component.add(id);
      for (const nb of adj.get(id) ?? []) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    components.push(component);
  }

  if (components.length <= 1) return nodes;

  // 진입 노드(incoming edge 없는 노드) 포함 컴포넌트를 상단에 배치
  const hasIncoming = new Set(edges.map((e) => e.target));
  components.sort((a, b) => {
    const aEntry = [...a].some((id) => !hasIncoming.has(id)) ? 0 : 1;
    const bEntry = [...b].some((id) => !hasIncoming.has(id)) ? 0 : 1;
    if (aEntry !== bEntry) return aEntry - bEntry;
    return b.size - a.size; // 같은 우선순위면 큰 컴포넌트 먼저
  });

  // 컴포넌트를 수직으로 쌓기
  let offsetY = 0;
  const result = [...nodes];
  for (const component of components) {
    const compNodes = result.filter((n) => component.has(n.id));
    let minY = Infinity,
      maxY = -Infinity;
    for (const n of compNodes) {
      minY = Math.min(minY, n.position.y);
      maxY = Math.max(maxY, n.position.y + nodeSize(n).height);
    }
    const shift = offsetY - minY;
    if (shift !== 0) {
      for (const n of compNodes) {
        const idx = result.findIndex((r) => r.id === n.id);
        if (idx >= 0) {
          result[idx] = {
            ...result[idx],
            position: { x: result[idx].position.x, y: result[idx].position.y + shift },
          };
        }
      }
    }
    offsetY += maxY - minY + COMPONENT_GAP;
  }

  return result;
}

type GroupData = { id: string; label: string; nodes: Node[] };

function applyGroupLayout(nodes: Node[]): Node[] {
  // layoutGroupId 기준으로 그룹핑
  const groupMap = new Map<string, GroupData>();
  for (const node of nodes) {
    const d = node.data as { layoutGroupId?: string; layoutGroupLabel?: string };
    const gid = d?.layoutGroupId;
    if (!gid) continue;
    if (!groupMap.has(gid)) {
      groupMap.set(gid, { id: gid, label: d.layoutGroupLabel ?? gid, nodes: [] });
    }
    groupMap.get(gid)!.nodes.push(node);
  }

  const groupNodes: Node<GroupNodeData>[] = [];
  // 이전 레이아웃 호출에서 생성된 그룹 노드가 input에 포함되어 있을 수 있으므로 필터링
  const result = nodes.filter((n) => !groupMap.has(n.id)).map((n) => ({ ...n }));

  for (const { id: gid, label, nodes: members } of groupMap.values()) {
    if (members.length < 2) continue;

    // bounding box 계산
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const m of members) {
      const { width: w, height: h } = nodeSize(m);
      minX = Math.min(minX, m.position.x);
      minY = Math.min(minY, m.position.y);
      maxX = Math.max(maxX, m.position.x + w);
      maxY = Math.max(maxY, m.position.y + h);
    }

    const gx = minX - GROUP_PADDING;
    const gy = minY - GROUP_PADDING;
    const gw = maxX - minX + GROUP_PADDING * 2;
    const gh = maxY - minY + GROUP_PADDING * 2;

    groupNodes.push({
      id: gid,
      type: 'groupNode',
      position: { x: gx, y: gy },
      style: { width: gw, height: gh },
      data: { label, color: 'gray' },
      zIndex: GROUP_Z_INDEX,
    });

    // 자식 노드를 그룹 좌표계로 변환
    for (const m of members) {
      const idx = result.findIndex((n) => n.id === m.id);
      if (idx < 0) continue;
      result[idx] = {
        ...result[idx],
        parentId: gid,
        extent: undefined,
        position: {
          x: result[idx].position.x - gx,
          y: result[idx].position.y - gy,
        },
      };
    }
  }

  // 그룹 노드를 앞에 배치해야 React Flow가 자식보다 먼저 렌더링
  return [...groupNodes, ...result];
}
