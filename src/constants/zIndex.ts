/**
 * z-index 레이어 상수.
 *
 * 두 가지 맥락이 섞여 있음:
 *  - node.zIndex / edge zIndex  : React Flow가 노드·엣지 div/svg에 inline CSS z-index로 적용
 *  - EdgeLabelRenderer 내부      : edgelabel-renderer 컨테이너 안의 상대 스택 순서
 *
 * React Flow 내부 참고값 (직접 사용 안 함):
 *  - 선택된 노드: 1000 (SELECTED_NODE_Z)
 *  - 그룹 소속 엣지: 선택된 노드 z + 1 이상
 */
export const Z_INDEX = {
  // ── React Flow node.zIndex ──────────────────────────────────────────────
  groupNode: -1001, // 그룹 배경 — 자식 노드보다 항상 아래
  nodeBase: 0, // 일반 노드 기본값
  commentNodeHover: 9999, // 댓글 노드 호버 시 — 다른 모든 노드 위

  // ── React Flow edge zIndex option ──────────────────────────────────────
  edge: 1, // 기본 엣지 (getElevatedEdgeZIndex의 base)

  // ── EdgeLabelRenderer 컨테이너 내부 상대 순서 ──────────────────────────
  edgeLabel: 1, // 엣지 comment 배지
  edgeHandle: 20, // 엣지 드래그 핸들 포인트

  // ── GroupNode 내부 ──────────────────────────────────────────────────────
  groupToolbar: 1, // NodeToolbar (그룹 라벨)

  // ── CSS 전역 오버라이드 (globals.css 참조) ──────────────────────────────
  // edgeLabelRenderer: 9999  → globals.css .react-flow__edgelabel-renderer
} as const;
