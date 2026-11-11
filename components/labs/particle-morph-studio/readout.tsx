import { barycentric, nativeMemory } from "@/lib/labs/particle-morph-studio/math";
import { shapeNames, type MorphMode, type View } from "@/lib/labs/particle-morph-studio/view";
import { positionAt, type Prepared } from "@/lib/labs/particle-morph-studio/session";
import type { Probe } from "./paint";
import styles from "./studio.module.css";

export function MorphReadout({
  data,
  view,
  time,
  mode,
  probe,
  randomTravel,
  spatialTravel,
}: {
  data: Prepared | null;
  view: View;
  time: number;
  mode: MorphMode;
  probe: Probe;
  randomTravel: number;
  spatialTravel: number;
}) {
  if (!data) return <p role="status">Chưa có ACTIVE. Mỗi batch chỉ xử lý một phần yêu cầu mới.</p>;
  const memory = nativeMemory(1_000_003);
  const p = positionAt(data, 0, time, view.matching, view.easing, view.path);
  const targetId = view.matching === "spatial" ? data.spatial[0] : data.random[0];
  const weights = barycentric(probe.u, probe.v);
  return (
    <div className={styles.readout}>
      <p>
        <strong>ACTIVE #{data.generation}:</strong> {shapeNames[data.settings.source]} →{" "}
        {shapeNames[data.settings.target]}, {data.settings.count.toLocaleString("vi-VN")} mẫu CPU;
        seed {data.settings.seed}, sampling {data.settings.sampling}. Không dùng một triệu điểm giả
        trên Canvas.
      </p>
      <p>
        Đường nối thẳng trung bình của cặp mẫu này: random{" "}
        <output>{randomTravel.toFixed(3)}</output>; spatial{" "}
        <output>{spatialTravel.toFixed(3)}</output> đơn vị. Đây không phải độ dài đường cung hay
        bằng chứng optimal transport.
      </p>
      <p>
        ID 0 → target ID <output>{targetId}</output>; vị trí hiện tại{" "}
        <output>
          ({p.x.toFixed(3)}, {p.y.toFixed(3)}, {p.z.toFixed(3)})
        </output>
        . ID không đổi khi kéo camera hoặc đổi A/B.
      </p>
      {mode === "area" && (
        <p>
          Trọng số của điểm trắng: ({weights.map((value) => value.toFixed(3)).join(", ")}), tổng{" "}
          {weights.reduce((a, b) => a + b).toFixed(3)}. Mỗi tam giác nhận số mẫu theo diện tích,
          không phải theo độ dài cạnh.
        </p>
      )}
      {mode === "timeline" && view.path === "flow" && (
        <p>
          Ba đường trong đồ thị là nhịp của ID 0, 7 và 42. Cùng model time nhưng mỗi hạt đi tới một
          phần khác nhau của đường; cả ba vẫn bắt đầu ở 0 và kết thúc ở 1.
        </p>
      )}
      {(mode === "sampling" || mode === "inspector" || mode === "showcase") && (
        <details open={mode === "sampling"}>
          <summary>Histogram: 16 nhóm tam giác theo độ cao tâm mặt</summary>
          <p>
            Cột xanh là tỷ lệ diện tích của cả nhóm; cột cam là tỷ lệ mẫu thực nhận. Nhóm không phải
            các lát cắt liên tục chính xác của bề mặt.
          </p>
          <div className={styles.histogram} aria-hidden="true">
            {Array.from(data.observed, (value, bin) => (
              <div key={bin}>
                <i style={{ height: Math.max(0, data.expected[bin] * 420) + "px" }} />
                <b style={{ height: Math.max(0, (value / data.settings.count) * 420) + "px" }} />
              </div>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Diện tích</th>
                <th>Mẫu thực</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(data.observed, (value, bin) => (
                <tr key={bin}>
                  <td>{bin}</td>
                  <td>{(data.expected[bin] * 100).toFixed(2)}%</td>
                  <td>
                    {value} ({((value / data.settings.count) * 100).toFixed(2)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {(mode === "buffers" || mode === "compute" || mode === "showcase") && (
        <details open={mode !== "showcase"}>
          <summary>Dung lượng C++ khi N = 1.000.003 — không phải heap JavaScript</summary>
          <table>
            <thead>
              <tr>
                <th>Buffer</th>
                <th>Byte</th>
              </tr>
            </thead>
            <tbody>
              {(["source", "target", "current", "path", "mapping"] as const).map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{memory[key].toLocaleString("vi-VN")}</td>
                </tr>
              ))}
              <tr>
                <td>Tổng payload</td>
                <td>{memory.payload.toLocaleString("vi-VN")}</td>
              </tr>
            </tbody>
          </table>
          <p>
            CURRENT có thêm một record canary 16 byte. Với local size 256: 3.907 workgroup tạo
            1.000.192 lanes; 189 lanes dư phải thoát trước khi ghi. Bảng này là phép tính, không
            phải dispatch GPU trong trình duyệt.
          </p>
        </details>
      )}
    </div>
  );
}
