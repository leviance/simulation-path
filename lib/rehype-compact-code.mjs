// One Dark's plain tokens inherit the same foreground from <pre>. Avoid emitting
// a redundant element for each one, including its duplicate React server payload.
export default function rehypeCompactCode() {
  return function transform(tree) {
    const visit = (node) => {
      if (!Array.isArray(node.children)) return;
      if (
        node.type === "element" &&
        node.tagName === "pre" &&
        node.properties?.["data-theme"] === "one-dark-pro" &&
        /(?:^|;)\s*color:\s*#abb2bf\s*(?:;|$)/i.test(node.properties.style ?? "")
      ) {
        const code = node.children.find((child) => child.tagName === "code");
        for (const line of code?.children ?? []) {
          if (line.tagName !== "span" || !("data-line" in (line.properties ?? {}))) continue;
          line.children = line.children.flatMap((token) => {
            const properties = token.properties ?? {};
            const inheritsForeground =
              token.tagName === "span" &&
              Object.keys(properties).length === 1 &&
              /^color:\s*#abb2bf;?$/i.test(properties.style ?? "") &&
              token.children?.every((child) => child.type === "text");
            return inheritsForeground ? token.children : [token];
          });
        }
      }
      for (const child of node.children) visit(child);
    };
    visit(tree);
  };
}
