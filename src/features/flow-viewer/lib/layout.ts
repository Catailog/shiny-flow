import type { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';

import type { GroupNodeData } from '../types';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 600; // 측정 전 초기 추정값
export const GROUP_Z_INDEX = -1001;

const GROUP_PADDING = 40;
const GRID_COL_GAP = 80;
const GRID_ROW_GAP = 100;
const GRID_MAX_COLS = 3;

function nodeSize(node: Node) {
  return {
    width: node.measured?.width ?? NODE_WIDTH,
    height: node.measured?.height ?? NODE_HEIGHT,
  };
}

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  for (const node of nodes) {
    const { width, height } = nodeSize(node);
    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const flat = nodes.map((node) => {
    const { width, height } = nodeSize(node);
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });

  // Dagre는 실제 엣지만으로 비그룹 노드를 배치하고,
  // 그룹 멤버는 외부 진입 노드 기준으로 그리드 배치로 덮어씀
  const gridded = placeGroupsAsGrids(flat, nodes, edges);
  return applyGroupLayout(separateComponents(gridded, edges));
}

// Dagre 배치 후 그룹 멤버를 깔끔한 그리드로 재배치
// - 외부 부모(그룹 밖 → 그룹 안 엣지의 source) 아래쪽에 그리드를 시작
// - 외부 부모가 없으면 Dagre minY를 기준으로 배치 (separateComponents가 컴포넌트 분리 처리)
function placeGroupsAsGrids(flat: Node[], origNodes: Node[], edges: Edge[]): Node[] {
  const groupMap = new Map<string, string[]>();
  const nodeGroupMap = new Map<string, string>();
  for (const n of flat) {
    const gid = (n.data as { layoutGroupId?: string })?.layoutGroupId;
    if (!gid) continue;
    nodeGroupMap.set(n.id, gid);
    if (!groupMap.has(gid)) groupMap.set(gid, []);
    groupMap.get(gid)!.push(n.id);
  }

  const result = flat.map((n) => ({ ...n }));

  for (const [gid, memberIds] of groupMap) {
    if (memberIds.length < 2) continue;

    // 외부 부모 중 가장 아래쪽(bottom Y 최대) 기준으로 그리드 시작 Y 결정
    let entryY: number | null = null;
    let entryCenterX: number | null = null;

    for (const e of edges) {
      if (nodeGroupMap.get(e.target) !== gid) continue;
      if (nodeGroupMap.get(e.source) === gid) continue;
      const parentFlat = flat.find((n) => n.id === e.source);
      const origParent = origNodes.find((n) => n.id === e.source);
      if (!parentFlat || !origParent) continue;
      const { width: pw, height: ph } = nodeSize(origParent);
      const bottom = parentFlat.position.y + ph + GRID_ROW_GAP;
      const cx = parentFlat.position.x + pw / 2;
      if (entryY === null || bottom > entryY) {
        entryY = bottom;
        entryCenterX = cx;
      }
    }

    // 외부 부모 없음 → Dagre minY + 멤버 중심 X 사용 (separateComponents가 이후 처리)
    if (entryY === null) {
      entryY = Math.min(...memberIds.map((id) => flat.find((n) => n.id === id)?.position.y ?? 0));
      const cxList = memberIds.map((id) => {
        const n = flat.find((nn) => nn.id === id);
        const orig = origNodes.find((nn) => nn.id === id);
        const w = orig ? nodeSize(orig).width : NODE_WIDTH;
        return (n?.position.x ?? 0) + w / 2;
      });
      entryCenterX = cxList.reduce((a, b) => a + b, 0) / cxList.length;
    }

    // 경로순 정렬 → 일관된 그리드 배치
    const sortedIds = [...memberIds].sort();
    const origMembers = sortedIds.map((id) => origNodes.find((n) => n.id === id)!);
    const maxW = Math.max(...origMembers.map((n) => nodeSize(n).width));
    const maxH = Math.max(...origMembers.map((n) => nodeSize(n).height));
    const cols = Math.min(sortedIds.length, GRID_MAX_COLS);
    const totalWidth = cols * maxW + (cols - 1) * GRID_COL_GAP;
    const startX = (entryCenterX ?? 0) - totalWidth / 2;

    sortedIds.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const idx = result.findIndex((n) => n.id === id);
      if (idx >= 0) {
        result[idx] = {
          ...result[idx],
          position: {
            x: startX + col * (maxW + GRID_COL_GAP),
            y: entryY! + row * (maxH + GRID_ROW_GAP),
          },
        };
      }
    });
  }

  return result;
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
