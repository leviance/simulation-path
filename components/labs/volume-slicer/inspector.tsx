import { linearStencil, sampleLinear, sampleNearest } from "@/lib/labs/volume-slicer/sampling";
import type { Vec3 } from "@/lib/labs/volume-slicer/model";
import type { Dataset } from "@/lib/labs/volume-slicer/dataset";
import styles from "./volume-slicer.module.css";
export function Inspector({ data, probe, stage }: { data: Dataset; probe: Vec3; stage: number }) {
  const stencil = linearStencil(data.volume, probe);
  return (
    <details className={styles.inspector} open={stage === 4}>
      <summary>Điểm này lấy dữ liệu từ đâu?</summary>
      <p>
        Scalar gốc: nearest <strong>{sampleNearest(data.volume, probe)?.toFixed(6)}</strong> ·
        trilinear <strong>{sampleLinear(data.volume, probe)?.toFixed(6)}</strong>.
      </p>
      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Voxel (i,j,k)</th>
              <th>Địa chỉ</th>
              <th>Scalar</th>
              <th>Trọng số</th>
            </tr>
          </thead>
          <tbody>
            {stencil?.map((row, index) => (
              <tr key={index}>
                <td>{row.voxel.join(", ")}</td>
                <td>{row.address}</td>
                <td>{row.value.toFixed(4)}</td>
                <td>{row.weight.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Tổng trọng số: {stencil?.reduce((sum, row) => sum + row.weight, 0).toFixed(9)}. Các dòng có
        thể trùng địa chỉ khi chạm biên; trọng số bằng 0 không thêm dữ liệu mới.
      </p>
    </details>
  );
}
export function Histogram({ data }: { data: Dataset }) {
  const peak = Math.max(1, ...data.statistics.bins);
  return (
    <figure className={styles.histogram}>
      <figcaption>
        Histogram của toàn bộ scalar gốc{" "}
        <span>Chiều cao log(1+n), không phải đổi giá trị voxel</span>
      </figcaption>
      <svg
        viewBox="0 0 256 80"
        role="img"
        aria-label={"Histogram đếm đủ " + data.statistics.count + " voxel"}
      >
        {Array.from(data.statistics.bins, (count, index) => {
          const height = (66 * Math.log1p(count)) / Math.log1p(peak);
          return (
            <rect
              key={index}
              x={index * 4}
              y={70 - height}
              width={3}
              height={height}
              fill="#7cb2bb"
            />
          );
        })}
        <text x="1" y="79" fill="#94b6bf" fontSize="8">
          0
        </text>
        <text x="248" y="79" fill="#94b6bf" fontSize="8">
          1
        </text>
      </svg>
    </figure>
  );
}
