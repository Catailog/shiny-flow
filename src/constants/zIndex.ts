// Two stacking contexts are mixed here:
//  - node.zIndex / edge zIndex: applied by ReactFlow as inline CSS z-index on node/edge elements
//  - inside EdgeLabelRenderer: relative stack order within the edgelabel-renderer container
//
// ReactFlow internal reference values (not used directly):
//  - selected node: 1000 (SELECTED_NODE_Z)
//  - edges belonging to a group: selected node z + 1 or higher
export const Z_INDEX = {
  // ── React Flow node.zIndex ──────────────────────────────────────────────
  groupNode: -1001, // group background — always below child nodes
  nodeBase: 0, // default for regular nodes
  commentNodeHover: 9999, // comment node on hover — above all other nodes

  // ── React Flow edge zIndex option ──────────────────────────────────────
  edge: 1, // default edge (base for getElevatedEdgeZIndex)

  // ── EdgeLabelRenderer container relative order ─────────────────────────
  edgeLabel: 1, // edge comment badge
  edgeHandle: 20, // edge drag handle point

  // ── GroupNode internal ──────────────────────────────────────────────────
  groupToolbar: 1, // NodeToolbar (group label)

  // ── Global CSS override (see globals.css) ──────────────────────────────
  // edgeLabelRenderer: 9999  → globals.css .react-flow__edgelabel-renderer
} as const;
