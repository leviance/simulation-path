import { computeSteering } from "@/lib/labs/boids";
import { useMemo } from "react";
import type { BoidsGrid, GridQuery } from "@/lib/labs/boids-grid";
import type { GridScene } from "@/lib/labs/boids-grid-scene";

export function BoidsGridReadout({
  scene,
  grid,
  query,
}: {
  scene: GridScene;
  grid: BoidsGrid;
  query: GridQuery;
}) {
  const metrics = scene.metrics;
  const selected = scene.boids[scene.selected];
  const steering = useMemo(
    () => computeSteering(scene.boids, scene.selected, query.neighbors, scene.params),
    [scene.boids, scene.selected, query.neighbors, scene.params],
  );
  return (
    <>
      <p>{scene.notice}</p>
      <dl className="lab-readout">
        <div>
          <dt>Toàn đàn đã cập nhật</dt>
          <dd>
            {scene.boids.length.toLocaleString("vi-VN")} cá thể · {scene.steps} bước · t=
            {scene.time.toFixed(3)} s
          </dd>
        </div>
        <div>
          <dt>Cá thể đang chọn</dt>
          <dd>
            ID {selected.id} · ({selected.position.x.toFixed(1)}, {selected.position.y.toFixed(1)})
          </dd>
        </div>
        <div>
          <dt>Query của cá thể đang chọn</dt>
          <dd>
            {query.cells.length} cell · {query.candidates.length} candidate ·{" "}
            {query.neighbors.length} hàng xóm
          </dd>
        </div>
        <div>
          <dt>Occupancy hiện tại</dt>
          <dd>
            {grid.occupiedCells}/{grid.buckets.length} cell có cá thể · nhiều nhất{" "}
            {grid.maximumOccupancy}/cell
          </dd>
        </div>
        {scene.debug &&
          (["separation", "alignment", "cohesion", "acceleration"] as const).map((name) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>
                ({steering[name].x.toFixed(2)}, {steering[name].y.toFixed(2)}) world/s²
              </dd>
            </div>
          ))}
        <div>
          <dt>Thời gian thực bỏ khi quá tải</dt>
          <dd>{scene.droppedSeconds.toFixed(3)} s — không chạy bù vô hạn</dd>
        </div>
        {metrics && (
          <>
            <div>
              <dt>Bước vừa xong: build / query / steering+update</dt>
              <dd>
                {metrics.buildMs.toFixed(2)} / {metrics.queryMs.toFixed(2)} /{" "}
                {metrics.updateMs.toFixed(2)} ms
              </dd>
            </div>
            <div>
              <dt>CPU toàn bước / độ trễ hoàn tất</dt>
              <dd>
                {metrics.totalMs.toFixed(2)} / {metrics.wallMs.toFixed(2)} ms
              </dd>
            </div>
            <div>
              <dt>Công việc toàn đàn trong bước vừa xong</dt>
              <dd>
                {metrics.candidates.toLocaleString("vi-VN")} candidate ·{" "}
                {metrics.neighbors.toLocaleString("vi-VN")} hàng xóm có hướng
              </dd>
            </div>
          </>
        )}
      </dl>
      {scene.job && (
        <p role="status">
          Đang tính {scene.job.nextIndex}/{scene.boids.length}; chưa đổi trạng thái đang hiển thị.
        </p>
      )}
      {scene.validation && (
        <p role="status">
          Đối chiếu {scene.validation.checked}/{scene.validation.snapshot.length} cá thể:{" "}
          {scene.validation.failures} sai khác ·{" "}
          {scene.validation.active
            ? "đang chạy"
            : scene.validation.checked === scene.validation.snapshot.length
              ? "hoàn tất"
              : "đã hủy"}
          . Tolerance 1e−9 cho steering và state một bước.
        </p>
      )}
      {scene.benchmark?.active && (
        <p role="status">
          Đang đo dòng {scene.benchmark.row + 1}/{scene.benchmark.cases.length}, lượt{" "}
          {scene.benchmark.iteration + 1}/7. Hai lượt làm nóng, năm mẫu đo; Escape để hủy.
        </p>
      )}
      {!!scene.benchmark?.rows.length && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>
              Đo trong trình duyệt; mỗi mẫu đọc lại cùng snapshot/seed. Các cột thành phần là median
              riêng, không nhất thiết cộng đúng median toàn bước. CPU không gồm thời gian chờ frame,
              vẽ hoặc checksum.
            </caption>
            <thead>
              <tr>
                <th>N / phân bố</th>
                <th>Cách tìm / S</th>
                <th>Build / query / update ms</th>
                <th>Toàn bước median [min–max] ms</th>
                <th>Candidate / neighbor</th>
                <th>Checksum</th>
              </tr>
            </thead>
            <tbody>
              {scene.benchmark.rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    {row.count} / {row.layout}
                  </td>
                  <td>
                    {row.method} / {row.cellSize}
                  </td>
                  <td>
                    {row.buildMs.toFixed(2)} / {row.queryMs.toFixed(2)} / {row.updateMs.toFixed(2)}
                  </td>
                  <td>
                    {row.medianMs.toFixed(2)} [{row.minMs.toFixed(2)}–{row.maxMs.toFixed(2)}] ·{" "}
                    {row.samples} mẫu
                  </td>
                  <td>
                    {row.candidates} / {row.neighbors}
                  </td>
                  <td>{row.checksum.toString(16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
