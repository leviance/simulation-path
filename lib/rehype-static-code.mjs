import { toHtml } from "hast-util-to-html";
import { packStaticMarkup } from "./static-markup.mjs";

// Preserve compiler HTML, but intern repeated tags before crossing RSC. The
// client boundary reconstructs identical markup during SSR and hydration.
export default function rehypeStaticCode() {
  return (tree) => {
    function visit(parent) {
      if (!Array.isArray(parent.children)) return;
      parent.children = parent.children.map((node) => {
        const isCode =
          node.type === "element" &&
          node.tagName === "pre" &&
          node.properties?.["data-theme"] === "one-dark-pro";
        const isMath =
          node.type === "element" &&
          node.properties?.className?.some((name) => name === "katex" || name === "katex-display");
        if (isCode || isMath) {
          const html = toHtml(node);
          const packed = packStaticMarkup(html);
          const literal = (value) => ({ type: "Literal", value, raw: JSON.stringify(value) });
          const property = (name, value) => ({
            type: "Property",
            kind: "init",
            method: false,
            shorthand: false,
            computed: false,
            key: { type: "Identifier", name },
            value,
          });
          return {
            type: isCode ? "mdxJsxFlowElement" : "mdxJsxTextElement",
            name: "CourseStaticMarkup",
            attributes: [
              {
                type: "mdxJsxAttribute",
                name: "kind",
                value: isCode ? "code" : "math",
              },
              {
                type: "mdxJsxAttribute",
                name: "packed",
                value: {
                  type: "mdxJsxAttributeValueExpression",
                  value: JSON.stringify(packed),
                  data: {
                    estree: {
                      type: "Program",
                      sourceType: "module",
                      body: [
                        {
                          type: "ExpressionStatement",
                          expression: {
                            type: "ObjectExpression",
                            properties: [
                              property("dictionary", {
                                type: "ArrayExpression",
                                elements: packed.dictionary.map(literal),
                              }),
                              property("parts", {
                                type: "ArrayExpression",
                                elements: packed.parts.map(literal),
                              }),
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
            children: [],
          };
        }
        visit(node);
        return node;
      });
    }
    visit(tree);
  };
}
