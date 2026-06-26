import type { Node } from '@xyflow/react';

import type { CommentNodeData } from '@/features/flow-viewer/components/FlowCommentNode';

export async function refreshCommentAuthorNames(nodes: Node[]): Promise<Node[]> {
  const accountIds = [
    ...new Set(
      nodes
        .filter((n) => n.type === 'commentNode' && !!(n.data as CommentNodeData).accountId)
        .map((n) => (n.data as CommentNodeData).accountId!),
    ),
  ];

  if (accountIds.length === 0) return nodes;

  const nameMap = new Map<string, string | null>();
  await Promise.all(
    accountIds.map(async (accountId) => {
      try {
        const res = await fetch(`/api/users/${accountId}`);
        if (res.ok) {
          const json = (await res.json()) as { name: string | null };
          nameMap.set(accountId, json.name);
        }
      } catch {
        // Keep existing name on fetch failure
      }
    }),
  );

  return nodes.map((n) => {
    if (n.type !== 'commentNode') return n;
    const data = n.data as CommentNodeData;
    if (!data.accountId) return n;
    const newName = nameMap.get(data.accountId);
    if (!newName || newName === data.author) return n;
    return { ...n, data: { ...data, author: newName } };
  });
}
