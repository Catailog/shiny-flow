import { Node, Project, SyntaxKind } from 'ts-morph';

import type { EdgeTrigger, FlowEdge } from './types';

type RawEdge = Omit<FlowEdge, 'id' | 'source'> & { source?: string };

export function extractEdges(filePaths: string[]): FlowEdge[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(filePaths);

  const edges: FlowEdge[] = [];
  let edgeIndex = 0;

  for (const sourceFile of project.getSourceFiles()) {
    const raw = extractEdgesFromFile(
      sourceFile.getFilePath(),
      sourceFile.getFullText(),
    );
    for (const edge of raw) {
      edges.push({ ...edge, id: `e${edgeIndex++}`, source: edge.source ?? '' });
    }
  }

  return edges;
}

function extractEdgesFromFile(filePath: string, content: string): RawEdge[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.createSourceFile('__tmp__.tsx', content, {
    overwrite: true,
  });

  const edges: RawEdge[] = [];

  sourceFile.forEachDescendant((node) => {
    const kind = node.getKind();

    // <Link href="...">
    if (
      kind === SyntaxKind.JsxOpeningElement ||
      kind === SyntaxKind.JsxSelfClosingElement
    ) {
      const tagName = node.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
      if (tagName !== 'Link') return;

      const hrefAttr = node
        .getChildrenOfKind(SyntaxKind.JsxAttributes)[0]
        ?.getChildrenOfKind(SyntaxKind.JsxAttribute)
        .find((attr) => attr.getFirstChild()?.getText() === 'href');

      if (!hrefAttr) return;

      const href = extractStringValue(hrefAttr.getLastChild());
      if (!href || !href.startsWith('/')) return;

      edges.push({
        target: href,
        trigger: 'link',
        sourceFile: filePath,
        sourceLine: node.getStartLineNumber(),
        label: extractLinkText(node),
      });
      return;
    }

    // router.push / router.replace / redirect
    if (kind === SyntaxKind.CallExpression && Node.isCallExpression(node)) {
      const exprText = node.getExpression().getText();

      const triggerMap: Record<string, EdgeTrigger> = {
        'router.push': 'router.push',
        'router.replace': 'router.push',
        redirect: 'redirect',
      };

      const trigger = triggerMap[exprText];
      if (!trigger) return;

      const firstArg = node.getArguments()[0];
      if (!firstArg) return;

      const target = extractStringValue(firstArg);
      if (!target || !target.startsWith('/')) return;

      edges.push({
        target,
        trigger,
        sourceFile: filePath,
        sourceLine: node.getStartLineNumber(),
      });
    }
  });

  return edges;
}

function extractStringValue(node: Node | undefined): string | undefined {
  if (!node) return undefined;

  if (node.getKind() === SyntaxKind.StringLiteral) {
    return node.getText().replace(/^['"]|['"]$/g, '');
  }

  // {"/path"} — JsxExpression 안의 StringLiteral
  if (node.getKind() === SyntaxKind.JsxExpression) {
    const inner = node.getFirstChildByKind(SyntaxKind.StringLiteral);
    if (inner) return inner.getText().replace(/^['"]|['"]$/g, '');
  }

  return undefined;
}

function extractLinkText(node: Node): string | undefined {
  const parent = node.getParent();
  if (!parent) return undefined;

  return parent
    .getDescendantsOfKind(SyntaxKind.JsxText)
    .map((n) => n.getText().trim())
    .find(Boolean);
}
