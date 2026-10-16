import { tolerance, type Visit } from "@/lib/labs/voxel-ray-editor";

const number = (v: number) => (Number.isFinite(v) ? v.toFixed(4) : "∞");
export function DdaReadout({ visit }: { visit: Visit | undefined }) {
  if (!visit) return <p>Không có visit để xem các mốc vượt mặt lưới.</p>;
  const next = Math.min(...visit.tMax);
  const axes = ["X", "Y", "Z"].filter((_, i) => visit.tMax[i] <= next + tolerance);
  const clipped = visit.exit < next - tolerance;
  return (
    <section aria-label="Trạng thái từng trục DDA">
      <table>
        <caption>DDA tại ô ({visit.cell.join(", ")}), trước khi rời ô</caption>
        <thead>
          <tr>
            <th>Trục</th>
            <th>step</th>
            <th>tMax</th>
            <th>tDelta</th>
            <th>Sắp vượt?</th>
          </tr>
        </thead>
        <tbody>
          {["X", "Y", "Z"].map((axis, i) => (
            <tr key={axis}>
              <th scope="row">{axis}</th>
              <td>{visit.step[i]}</td>
              <td>{number(visit.tMax[i])}</td>
              <td>{number(visit.tDelta[i])}</td>
              <td>{!clipped && axes.includes(axis) ? "Có" : "Không"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {clipped
          ? "Đoạn clip kết thúc trước mặt lưới kế tiếp."
          : `Mốc gần nhất t=${number(next)}; vượt ${axes.join(" + ")}.`}{" "}
        Bảng ghi lại trạng thái lúc tính trace; xem lại không chạy thêm traversal.
      </p>
    </section>
  );
}
