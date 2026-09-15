import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { findLessonSection, nodeText } from "../lib/lesson-sections.mjs";

const mdxParser = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] });

export function mdxProse(source) {
  const fragments = [];
  visit(mdxParser.parse(source), (node) => {
    // Code and math have their own node types. Inspecting only prose text avoids
    // treating valid commands such as LaTeX \\nabla as escaped-newline artifacts.
    if (node.type === "text") fragments.push(node.value);
  });
  return fragments.join("\n");
}

export function lessonSectionUsages(source) {
  return mdxParser.parse(source).children.flatMap((node) => {
    if (node.type !== "heading" || node.depth !== 2) return [];
    const heading = nodeText(node);
    const section = findLessonSection(heading);
    if (!section) return [];
    return [
      { ...section, heading, start: node.position.start.offset, end: node.position.end.offset },
    ];
  });
}

function visit(node, callback) {
  callback(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visit(child, callback);
}

function staticAttribute(node, attributeName, label) {
  const matches = node.attributes.filter(
    (attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === attributeName,
  );
  if (matches.length > 1) {
    throw new Error(`${label} repeats the ${attributeName} attribute`);
  }
  if (matches.length === 0) return undefined;
  const value = matches[0].value;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must use a non-empty static string for ${attributeName}`);
  }
  return value;
}

export function interactiveLabUsages(source, sourceLabel = "MDX source") {
  let tree;
  try {
    tree = mdxParser.parse(source);
  } catch (error) {
    throw new Error(`${sourceLabel} cannot be parsed as MDX: ${error.message}`, { cause: error });
  }

  const usages = [];
  visit(tree, (node) => {
    if (
      (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") ||
      node.name !== "InteractiveLab"
    ) {
      return;
    }
    const label = `${sourceLabel} <InteractiveLab>`;
    const demo = staticAttribute(node, "demo", label);
    if (!demo) throw new Error(`${label} is missing the demo attribute`);
    usages.push({ demo, mode: staticAttribute(node, "mode", label) });
  });
  return usages;
}
