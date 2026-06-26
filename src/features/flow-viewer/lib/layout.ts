import type { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';

import { Z_INDEX } from '@/constants/zIndex';

import type { GroupNodeData } from '../types';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 600;
const NODE_HEIGHT_SMALL = 80;
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
  // Classify group members by layoutGroupId
  const groupMemberMap = new Map<string, Node[]>();
  for (const node of nodes) {
    const gid = (node.data as { layoutGroupId?: string })?.layoutGroupId;
    if (!gid) continue;
    if (!groupMemberMap.has(gid)) groupMemberMap.set(gid, []);
    groupMemberMap.get(gid)!.push(node);
  }

  // Compute internal layout and pre-build groupNode objects
  type GroupLayout = {
    width: number;
    height: number;
    positions: Map<string, { x: number; y: number }>;
    groupNode: Node<GroupNodeData>;
  };
  const groupLayouts = new Map<string, GroupLayout>();
  for (const [gid, members] of groupMemberMap) {
    if (members.length < 2) continue;
    const internal = layoutGroupInternally(members, edges);
    const label = (members[0].data as { layoutGroupLabel?: string })?.layoutGroupLabel ?? gid;
    groupLayouts.set(gid, {
      ...internal,
      groupNode: {
        id: gid,
        type: 'groupNode',
        position: { x: 0, y: 0 },
        style: { width: internal.width, height: internal.height },
        data: { label, color: 'gray' },
        zIndex: GROUP_Z_INDEX,
      },
    });
  }

  // IDs to exclude from the main Dagre layout
  const groupedIds = new Set([...groupMemberMap.values()].flatMap((ms) => ms.map((m) => m.id)));
  const existingGroupIds = new Set(nodes.filter((n) => n.type === 'groupNode').map((n) => n.id));

  // Main Dagre layout
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  for (const node of nodes) {
    if (groupedIds.has(node.id) || existingGroupIds.has(node.id)) continue;
    const { width, height } = nodeSize(node);
    graph.setNode(node.id, { width, height });
  }

  for (const [gid, layout] of groupLayouts) {
    graph.setNode(gid, { width: layout.width, height: layout.height });
  }

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
    if (srcId === tgtId) continue;
    if (!graph.hasNode(srcId) || !graph.hasNode(tgtId)) continue;
    const key = `${srcId}->${tgtId}`;
    if (addedEdges.has(key)) continue;
    addedEdges.add(key);
    graph.setEdge(srcId, tgtId);
  }

  dagre.layout(graph);

  // Assemble result — groupNodes must come before their children for ReactFlow to render correctly
  const groupNodes: Node[] = [];
  const memberNodes: Node[] = [];
  const regularNodes: Node[] = [];

  for (const node of nodes) {
    if (groupedIds.has(node.id) || existingGroupIds.has(node.id)) continue;
    const dn = graph.node(node.id);
    if (!dn) {
      regularNodes.push(node);
      continue;
    }
    const { width, height } = nodeSize(node);
    regularNodes.push({ ...node, position: { x: dn.x - width / 2, y: dn.y - height / 2 } });
  }

  for (const [gid, layout] of groupLayouts) {
    const dn = graph.node(gid);
    if (!dn) continue;
    const gx = dn.x - layout.width / 2;
    const gy = dn.y - layout.height / 2;

    groupNodes.push({ ...layout.groupNode, position: { x: gx, y: gy } });

    for (const member of groupMemberMap.get(gid) ?? []) {
      const relPos = layout.positions.get(member.id);
      if (!relPos) continue;
      memberNodes.push({
        ...member,
        parentId: gid,
        extent: undefined,
        position: { x: GROUP_PADDING + relPos.x, y: GROUP_PADDING + relPos.y },
      });
    }
  }

  return [...groupNodes, ...memberNodes, ...regularNodes];
}
