import { readFile } from "node:fs/promises";
import ts from "typescript";

// Execute the actual callback with explicit fake dependencies, not a copied handler.
// This checks event routing without claiming to exercise browser capture or layout.
async function findCallback(file, select, env) {
  const source = await readFile(new URL(`../components/labs/${file}`, import.meta.url), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let selected;
  function visit(node) {
    const candidate = select(node, tree);
    if (candidate !== undefined) selected = candidate;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!selected) throw new Error(`Callback not found in ${file}`);
  const code = ts.transpileModule(`const actual = ${selected};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(env), `${code}; return actual;`)(...Object.values(env));
}

export function componentCallback(file, name, env) {
  return findCallback(
    file,
    (node, tree) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
        // Function declarations may be exported; the test evaluates an expression.
        return node.getText(tree).replace(/^export\s+(?:default\s+)?/, "");
      }
      if (!ts.isVariableDeclaration(node) || node.name.getText(tree) !== name || !node.initializer)
        return;
      const expression = node.initializer;
      if (ts.isCallExpression(expression) && expression.expression.getText(tree) === "useCallback")
        return expression.arguments[0].getText(tree);
      return expression.getText(tree);
    },
    env,
  );
}

export function canvasCallback(file, attribute, env) {
  return findCallback(
    file,
    (node, tree) => {
      if (
        (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) ||
        node.tagName.getText(tree) !== "canvas"
      )
        return;
      const prop = node.attributes.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name.getText(tree) === attribute,
      );
      if (prop?.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression)
        return prop.initializer.expression.getText(tree);
    },
    env,
  );
}

export function componentEffect(file, marker, env) {
  return findCallback(
    file,
    (node, tree) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(tree) === "useEffect" &&
        node.arguments[0]?.getText(tree).includes(marker)
      )
        return node.arguments[0].getText(tree);
    },
    env,
  );
}
