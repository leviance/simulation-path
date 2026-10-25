import type { MapScene } from "@/lib/labs/map-scene";

export function MapEditorReadout({
  scene,
  measurementsReady,
}: {
  scene: MapScene;
  measurementsReady: boolean;
}) {
  const document = scene.document;
  const inspected: number[] = [];
  for (const id of document.selection) {
    inspected.push(id);
    if (inspected.length === 3) break;
  }
  return (
    <>
      <p role="status">{document.notice}</p>
      <dl className="lab-readout">
        <div>
          <dt>Dataset / đang thấy / đã chọn</dt>
          <dd>
            {document.tree.objects.size.toLocaleString("vi-VN")} /{" "}
            {scene.visible.ids.length.toLocaleString("vi-VN")} /{" "}
            {document.selection.size.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div>
          <dt>Camera world / zoom</dt>
          <dd>
            ({scene.camera.x.toFixed(1)}, {scene.camera.y.toFixed(1)}) /{" "}
            {scene.camera.zoom.toFixed(3)}
          </dd>
        </div>
        <div>
          <dt>Index build / số node</dt>
          <dd>
            {measurementsReady ? document.tree.buildMilliseconds.toFixed(2) : "—"} ms /{" "}
            {document.tree.nodes.length.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div>
          <dt>Culling viewport</dt>
          <dd>
            {measurementsReady ? scene.visible.milliseconds.toFixed(2) : "—"} ms ·{" "}
            {scene.visible.candidates.toLocaleString("vi-VN")} object test ·{" "}
            {scene.visible.visited.length} visited / {scene.visible.pruned.length} pruned
          </dd>
        </div>
        {document.lastQuery && (
          <div>
            <dt>Query chọn gần nhất</dt>
            <dd>
              {document.lastQuery.milliseconds.toFixed(2)} ms ·{" "}
              {document.lastQuery.candidates.toLocaleString("vi-VN")} candidate ·{" "}
              {document.lastQuery.ids.length} hit
            </dd>
          </div>
        )}
        {document.edit && (
          <div>
            <dt>Update gần nhất</dt>
            <dd>
              {document.edit.action} · {document.edit.objects} đối tượng ·{" "}
              {document.edit.milliseconds.toFixed(2)} ms
            </dd>
          </div>
        )}
      </dl>
      {scene.gesture && (
        <p>
          Đang thao tác: {scene.gesture.tool}. Chưa commit thay đổi vị trí; Escape hoặc mất capture
          để hủy.
        </p>
      )}
      {inspected.length > 0 && (
        <ul aria-label="Một số đối tượng đang chọn">
          {inspected.map((id) => {
            const object = document.tree.objects.get(id)!;
            return (
              <li key={id}>
                ID {id} · {object.kind} · position ({object.box.x.toFixed(1)},{" "}
                {object.box.y.toFixed(1)}) · size {object.box.width.toFixed(1)}×
                {object.box.height.toFixed(1)}
              </li>
            );
          })}
        </ul>
      )}
      {scene.debug && (
        <p>
          Lớp debug vẽ tối đa 4.096 hộp node đang giao viewport; dataset/query không bị cắt bớt.
          Xanh lá: visited, đỏ: pruned, xanh dương: topology.
        </p>
      )}
    </>
  );
}
