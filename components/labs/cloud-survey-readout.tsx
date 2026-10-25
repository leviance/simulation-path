import type { CloudScene } from "@/lib/labs/cloud-survey/scene";
import type { Vec3 } from "@/lib/labs/cloud-survey/geometry";
import { cameraBasis } from "@/lib/labs/cloud-survey/camera";

export function CloudSurveyReadout({
  scene,
  ready,
  renderInfo,
}: {
  scene: CloudScene;
  ready: boolean;
  renderInfo: { drawn: number; milliseconds: number };
}) {
  const stage = scene.stage;
  const vector = (p: Vec3 | null) =>
    p ? `(${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)})` : "—";
  return (
    <dl className="lab-readout">
      <div>
        <dt>Dataset / visible / drawn / selected</dt>
        <dd>
          {scene.count.toLocaleString("vi-VN")} /{" "}
          {scene.visible.indices.length.toLocaleString("vi-VN")} /{" "}
          {ready ? renderInfo.drawn.toLocaleString("vi-VN") : "—"} /{" "}
          {scene.selected.indices.length.toLocaleString("vi-VN")}
        </dd>
      </div>
      <div>
        <dt>Build / query / culling / CPU render (ms)</dt>
        <dd>
          {ready
            ? [
                scene.tree.buildMilliseconds,
                scene.selected.milliseconds,
                scene.visible.milliseconds,
                renderInfo.milliseconds,
              ]
                .map((value) => value.toFixed(3))
                .join(" / ")
            : "—"}
        </dd>
      </div>
      <div>
        <dt>Query candidates / visited / pruned</dt>
        <dd>
          {scene.selected.candidates} / {scene.selected.visited.length} /{" "}
          {scene.selected.pruned.length}
        </dd>
      </div>
      <div>
        <dt>Camera eye (m)</dt>
        <dd>{vector(cameraBasis(scene.camera).eye)}</dd>
      </div>
      {stage >= 7 && (
        <>
          <div>
            <dt>Count / centroid (m)</dt>
            <dd>
              {scene.summary.count} / {vector(scene.summary.centroid)}
            </dd>
          </div>
          <div>
            <dt>Bounds min → max (m)</dt>
            <dd>
              {scene.summary.bounds
                ? `${vector(scene.summary.bounds.minimum)} → ${vector(scene.summary.bounds.maximum)}`
                : "Selection rỗng; không có bounds/centroid."}
            </dd>
          </div>
        </>
      )}
    </dl>
  );
}
