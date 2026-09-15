import { findLessonSection, nodeText } from "./lesson-sections.mjs";

// Run after rehype-slug, before autolinking. Keep the visible title and its old
// deep link, while the TOC uses a stable anchor independent of wording changes.
export default function rehypeLessonSections() {
  return (tree) => {
    const seen = new Set();
    function visit(node) {
      if (node.type === "element" && node.tagName === "h2") {
        const section = findLessonSection(nodeText(node));
        if (section) {
          if (seen.has(section.key)) {
            throw new Error(`Duplicate lesson section: ${section.key}`);
          }
          seen.add(section.key);
          node.properties ??= {};
          const oldId = node.properties.id;
          node.properties.id = section.id;
          node.properties["data-lesson-section"] = section.key;
          if (oldId && oldId !== section.id) {
            node.children.unshift({
              type: "element",
              tagName: "span",
              properties: { id: oldId, ariaHidden: "true" },
              children: [],
            });
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
