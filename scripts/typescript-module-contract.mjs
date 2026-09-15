import ts from "typescript";

export function runtimeModuleSpecifiers(source, sourceLabel = "generated JavaScript") {
  const sourceFile = ts.createSourceFile(
    sourceLabel,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  );
  const specifiers = new Set();

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [specifier] = node.arguments;
      specifiers.add(ts.isStringLiteral(specifier) ? specifier.text : "<dynamic expression>");
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...specifiers];
}

export function assertSelfContainedModule(source, sourceLabel) {
  const specifiers = runtimeModuleSpecifiers(source, sourceLabel);
  if (specifiers.length === 0) return;
  throw new Error(
    `${sourceLabel} contains runtime imports (${specifiers.join(", ")}). ` +
      "Generated course metadata must be self-contained; use import type or move the value into this module.",
  );
}
