import { find, locate, contentBox, type Lab } from "@/lib/labs/box-layout";
export function LayoutInspector({
  lab,
  selected,
  onSelect,
}: {
  lab: Lab;
  selected: number;
  onSelect: (id: number) => void;
}) {
  const nodes: { id: number; text: string }[] = [];
  const visit = (node: Lab["tree"]["root"], depth: number) => {
    nodes.push({
      id: node.id,
      text: `${"· ".repeat(depth)}${node.kind} #${node.id} ${node.visible ? "" : "(ẩn)"}`,
    });
    node.children.forEach((child) => visit(child, depth + 1));
  };
  visit(lab.tree.root, 0);
  const own = find(lab.tree.root, selected),
    view = locate(lab.tree, selected),
    style = lab.styles.get(selected),
    measured = lab.sizes.get(selected);
  const rect = (r: { x: number; y: number; width: number; height: number }) =>
    `(${r.x.toFixed(1)}, ${r.y.toFixed(1)}) ${r.width.toFixed(1)}×${r.height.toFixed(1)}`;
  return (
    <details open>
      <summary>Kiểm tra các hộp</summary>
      <label>
        Widget đang xem{" "}
        <select value={own ? selected : 1} onChange={(e) => onSelect(Number(e.target.value))}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.text}
            </option>
          ))}
        </select>
      </label>
      {own && <p>Local border box: {rect(own.local)}.</p>}
      {lab.stage >= 2 && view && style && (
        <p>
          World: {rect(view.bounds)}. Content: {rect(contentBox(view.bounds, style))}. Clip:{" "}
          {rect(view.clip)}.
        </p>
      )}
      {lab.stage >= 2 && style && (
        <pre aria-label="Style đầu vào">{JSON.stringify(style, null, 4)}</pre>
      )}
      {lab.stage >= 3 && (
        <p>
          Measure:{" "}
          {measured
            ? `${measured.width}×${measured.height}; naturalHeight=${measured.naturalHeight}`
            : "Không đo node ẩn hoặc node thuộc nhánh ẩn."}
        </p>
      )}
      <p>
        Cam nét đứt: margin box; xanh dương: border box; xanh lá: content box. Đây là lớp chẩn đoán,
        không phải vùng nhận chuột. Margin không nhận input; padding và border thuộc Panel vẫn chắn
        chuột.
      </p>
    </details>
  );
}
