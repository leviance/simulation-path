import type { BulbSession } from "@/lib/labs/mandelbulb-explorer/session";
import type { Field } from "@/lib/labs/mandelbulb-explorer/field";
import type { RaySample } from "@/lib/labs/mandelbulb-explorer/trace";
import { batchBound, previewSettings, type Vec3 } from "@/lib/labs/mandelbulb-explorer/math";
import { stateName } from "@/lib/labs/mandelbulb-explorer/view";
import styles from "./explorer.module.css";
export interface ProbeInfo {
  point: Vec3;
  field: Field;
  orbit: Vec3[];
  ray: RaySample | null;
}
export function BulbReadout({ session, info, error }: { session: BulbSession; info: ProbeInfo | null; error: string }) {
  const active = session.active,
    c = session.counters;
  const state = () => {
    if (!active) return "Chưa có ảnh ACTIVE";
    if (session.cancelled) return "Đã hủy lượt tính; giữ ảnh ACTIVE gần nhất";
    if (session.pendingPreview)
      return "Đang chuẩn bị preview mới; nhãn và ảnh ACTIVE cũ vẫn đi cùng nhau";
    if (session.complete) return "Ảnh Canvas đã đủ mẫu; đây không phải mốc 960×540 native";
    if (session.paused) return "Refinement đang dừng; camera và preview vẫn dùng được";
    return "Đang tinh chỉnh ảnh Canvas theo batch hữu hạn";
  };
  return (
    <div className={styles.readout}>
      <p className={styles.status} role="status">
        {error || state()}
      </p>
      <progress aria-label="Tiến độ refinement Canvas" max={1} value={session.progress} />
      <dl>
        <div>
          <dt>Yêu cầu / ACTIVE</dt>
          <dd>
            {session.requested?.generation ?? "—"} / {active?.generation ?? "—"}
          </dd>
        </div>
        <div>
          <dt>Thông số ACTIVE (không phải input chưa áp dụng)</dt>
          <dd>
            {active
              ? `P${active.settings.power} · orbit ${active.settings.iterations} · steps ${active.settings.raySteps} · ε ${active.settings.epsilon}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Mẫu final đã tính</dt>
          <dd>
            {c.samples.toLocaleString()} /{" "}
            {active ? (96 * 54 * active.settings.samples).toLocaleString() : "—"}
          </dd>
        </div>
        {active && <div><dt>Giới hạn preview thực tế</dt><dd>32×18 · orbit {previewSettings(active.settings).iterations} · steps {previewSettings(active.settings).raySteps} · ε {previewSettings(active.settings).epsilon} · H {previewSettings(active.settings).normalStep}</dd></div>}
        <div>
          <dt>Ray steps / orbit bodies thực tế</dt>
          <dd>
            {c.steps.toLocaleString()} / {c.iterations.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt>Hit / miss / hết budget / inside / invalid</dt>
          <dd>
            {c.hits} / {c.misses} / {c.budget} / {c.inside} / {c.invalid}
          </dd>
        </div>
        <div>
          <dt>Batch cuối / giới hạn công việc</dt>
          <dd>
            {session.lastBatchPixels} pixel, {session.lastBatchWork.toLocaleString()} orbit bodies;
            tối đa {active ? batchBound(active.settings).toLocaleString() : "—"}/batch
          </dd>
        </div>
      </dl>
      {info && (
        <details open>
          <summary>Điểm / ray đang kiểm</summary>
          <p>
            c = ({info.point.x.toFixed(4)}, {info.point.y.toFixed(4)}, {info.point.z.toFixed(4)});
            orbit {info.field.state}, {info.field.iterations} vòng; DE{" "}
            {info.field.distance.toExponential(3)}.
          </p>
          {info.ray && (
            <p>
              Ray: {stateName(info.ray.state)}, t={info.ray.t.toFixed(5)}; {info.ray.raySteps} bước
              và {info.ray.orbitIterations} orbit bodies. Đây là phép kiểm một ray riêng, không cộng
              vào counters ảnh.
            </p>
          )}
          <p>
            r={Math.hypot(info.point.x, info.point.y, info.point.z).toFixed(4)}. Ở r=0 không tính
            góc; “bounded” chỉ có nghĩa chưa thoát trong số vòng đã chọn.
          </p>
          <div style={{ maxHeight: 180, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>n</th>
                  <th>z.x</th>
                  <th>z.y</th>
                  <th>z.z</th>
                </tr>
              </thead>
              <tbody>
                {info.orbit.map((z, index) => (
                  <tr key={index}>
                    <td>{index}</td>
                    <td>{z.x.toPrecision(4)}</td>
                    <td>{z.y.toPrecision(4)}</td>
                    <td>{z.z.toPrecision(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <p>
        Canvas dùng JavaScript/Canvas 2D, tối đa 96×54, 12 orbit iterations và 96 ray steps. Native
        dùng OpenGL 4.3, ảnh 960×540 và giới hạn riêng. Các số ở đây là số phép tính CPU, không phải
        timings hoặc benchmark GPU. Tím: hết ray budget; cam: camera nằm trong vùng bounded; hồng:
        invalid.
      </p>
    </div>
  );
}
