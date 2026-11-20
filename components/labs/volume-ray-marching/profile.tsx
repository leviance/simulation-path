import type { Result } from "@/lib/labs/volume-ray-marching/march";
import type { Mode } from "@/lib/labs/volume-ray-marching/model";
import styles from "./volume-ray-marching.module.css";
export function Profile({ trace, shown, mode }: { trace: Result; shown: number; mode: Mode }) {
  const entry = trace.profile[0] ? trace.profile[0].distance - trace.profile[0].ds / 2 : 0;
  const x = (distance: number) =>
    trace.length > 0 ? 10 + ((distance - entry) / trace.length) * 580 : 10;
  const points = trace.profile
    .map((sample) => x(sample.distance) + "," + (104 - sample.density * 90))
    .join(" ");
  const tPoints = trace.profile
    .map((sample) => x(sample.distance) + "," + (104 - sample.transmittance * 90))
    .join(" ");
  const current = trace.profile[Math.max(0, shown - 1)];
  const start = Math.max(0, shown - 4),
    visible = trace.profile.slice(start, start + 8);
  return (
    <section className={styles.profile} aria-label="Các mẫu dọc tia">
      <header>
        <h4>Tia này đã đọc những gì?</h4>
        <span data-trace-count>
          {shown} / {trace.samples} mẫu · L={trace.length.toFixed(5)} world units
        </span>
      </header>
      <svg viewBox="0 0 600 122" role="img" aria-label="Đồ thị mật độ và transmittance dọc tia">
        <path d="M10 14V104H590" stroke="#456573" fill="none" />
        <polyline points={points} stroke="#f6ab68" fill="none" strokeWidth="2" />
        {mode === "alpha" && (
          <polyline points={tPoints} stroke="#72d8c5" fill="none" strokeWidth="1.5" />
        )}
        {shown > 0 && current && (
          <line
            x1={x(current.distance)}
            x2={x(current.distance)}
            y1={8}
            y2={104}
            stroke="#f9ead3"
          />
        )}
      </svg>
      <p>
        Từ trái sang phải: điểm vào đến điểm ra khỏi khối. Cam: ρ sau cutoff.{" "}
        {mode === "alpha"
          ? "Xanh: T còn truyền qua; đây là emission–absorption đơn giản, không phải tán xạ ánh sáng."
          : "MIP lấy giá trị lớn nhất; average lấy trung bình có trọng số ds. Hai phép chiếu này không có ý nghĩa suy giảm quang học."}
      </p>
      <div className={styles.readout}>
        {mode === "mip" && (
          <span>
            MIP: <output>{trace.maximum.toFixed(7)}</output>
          </span>
        )}
        {mode === "average" && (
          <span>
            Average: <output>{trace.mean.toFixed(7)}</output>
          </span>
        )}
        {mode === "alpha" && (
          <span>
            T cuối: <output data-transmittance>{trace.transmittance.toFixed(7)}</output> · opacity:{" "}
            {(1 - trace.transmittance).toFixed(7)}
          </span>
        )}
      </div>
      <details>
        <summary>Đọc số của tám mẫu gần con trỏ bước</summary>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Mẫu</th>
                <th>t</th>
                <th>ds</th>
                <th>ρ gốc</th>
                <th>ρ sau cutoff</th>
                <th>{mode === "alpha" ? "T" : "Giá trị đang tích lũy"}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((sample, i) => (
                <tr key={start + i} aria-current={start + i === shown - 1 ? "step" : undefined}>
                  <td>{start + i + 1}</td>
                  <td>{sample.distance.toFixed(4)}</td>
                  <td>{sample.ds.toFixed(4)}</td>
                  <td>{sample.raw.toFixed(5)}</td>
                  <td>{sample.density.toFixed(5)}</td>
                  <td>
                    {(mode === "alpha"
                      ? sample.transmittance
                      : mode === "mip"
                        ? sample.maximum
                        : sample.mean
                    ).toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
