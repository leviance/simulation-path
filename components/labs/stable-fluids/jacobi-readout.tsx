import { inspectJacobiCell, type FluidGrid, type JacobiTrace } from "@/lib/labs/stable-fluids";
import { LabReadout } from "../lab-shared";

export function JacobiReadout({
  grid,
  x,
  y,
  trace,
}: {
  grid: FluidGrid;
  x: number;
  y: number;
  trace: JacobiTrace | null;
}) {
  if (!grid.pressureReady)
    return (
      <p>
        Bấm “Tiến một vòng Jacobi” để lập RHS từ velocity hiện có và chạy vòng đầu tiên. Ca Jacobi
        8×8 có đáp án tính tay trong bài. Sau projection hoặc khuấy, cần lập lại RHS trước khi đọc
        stencil kế tiếp.
      </p>
    );
  const cell = inspectJacobiCell(grid, x, y);
  const value = (nx: number, ny: number) =>
    nx < 0 || ny < 0 || nx >= grid.n || ny >= grid.n
      ? "Tường"
      : grid.pressure[ny * grid.n + nx].toFixed(6);
  const items = [
    { label: "Số vòng Jacobi đã chạy", value: String(grid.pressureIterations) },
    { label: "RHS ô đang chọn", value: cell.rhs.toFixed(6) },
    {
      label: "Pressure trái / phải / dưới / trên",
      value: [value(x - 1, y), value(x + 1, y), value(x, y - 1), value(x, y + 1)].join(" / "),
    },
    {
      label: "Tổng pressure hàng xóm / số hàng xóm",
      value: cell.sum.toFixed(6) + " / " + cell.count,
    },
    { label: "Candidate ở vòng kế tiếp", value: cell.candidate.toFixed(6) },
  ];
  if (trace)
    items.push(
      {
        label: "Vòng vừa chạy tại ô",
        value: "(" + trace.x + "; " + trace.y + ") · vòng " + trace.iteration,
      },
      {
        label: "Pressure cũ / candidate / sau blend",
        value: [trace.previous, trace.candidate, trace.weighted]
          .map((p) => p.toFixed(6))
          .join(" / "),
      },
      {
        label: "Mean đã trừ / pressure kết quả",
        value: trace.gauge.toFixed(9) + " / " + trace.result.toFixed(9),
      },
    );
  return <LabReadout items={items} />;
}
