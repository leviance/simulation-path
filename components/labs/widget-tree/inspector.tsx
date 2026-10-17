import { find, locate, type Tree, type Widget } from "@/lib/labs/widget-tree";
export function TreeInspector({
  tree,
  selected,
  onSelect,
  stage,
}: {
  tree: Tree;
  selected: number;
  onSelect: (id: number) => void;
  stage: number;
}) {
  const nodes: { node: Widget; depth: number }[] = [];
  const visit = (node: Widget, depth: number) => {
    nodes.push({ node, depth });
    node.children.forEach((child) => visit(child, depth + 1));
  };
  visit(tree.root, 0);
  const own = find(tree.root, selected),
    placed = locate(tree, selected, stage);
  const rect = (r: { x: number; y: number; width: number; height: number }) =>
    `(${r.x}, ${r.y}) ${r.width}×${r.height}`;
  return (
    <details open>
      <summary>Cây widget và tọa độ</summary>
      <label>
        Widget đang xem{" "}
        <select value={own?.id ?? 1} onChange={(e) => onSelect(Number(e.target.value))}>
          {nodes.map(({ node, depth }) => (
            <option key={node.id} value={node.id}>
              {"· ".repeat(depth)}
              {node.kind} #{node.id}
              {!node.visible ? " — ẩn" : ""}
              {!node.enabled ? " — vô hiệu hóa" : ""}
            </option>
          ))}
        </select>
      </label>
      <pre aria-label="Cấu trúc cây widget">
        {nodes
          .map(({ node, depth }) => `${"  ".repeat(depth)}${node.kind} #${node.id} ${node.text}`)
          .join("\n")}
      </pre>
      {own && (
        <p>
          Local: {rect(own.local)}.{" "}
          {placed
            ? `World: ${rect(placed.bounds)}. Clip: ${rect(placed.clip)}.`
            : "Node vẫn thuộc cây, nhưng đang bị ẩn hoặc nằm hoàn toàn ngoài clip."}
        </p>
      )}
      <p>
        Inspector đọc cây sở hữu, kể cả node ẩn. `focus` của UI là trạng thái khác với widget đang
        xem trong danh sách này.
      </p>
    </details>
  );
}
