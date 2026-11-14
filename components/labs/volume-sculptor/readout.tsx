import type { SculptSession } from "@/lib/labs/volume-sculptor/session";
import { slicePoint, type VolumeView } from "@/lib/labs/volume-sculptor/view";
import { LabReadout } from "../lab-shared";

const format = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format;

export function VolumeReadout({ session, view }: { session: SculptSession; view: VolumeView }) {
  const mesh = session.lastGood,
    job = session.job,
    point = slicePoint(session.grid.spec, view.slice);
  const items = [
    {
      label: "CPU samples / cells",
      value: `${format(session.grid.spec.sampleCount())} / ${format(session.grid.spec.cellCount())}`,
    },
    {
      label: "Scalar bytes",
      value: `${format(session.grid.values.byteLength)} (chưa gồm history/mesh/JS)`,
    },
    {
      label: "Field / mesh revision",
      value: `${session.fieldRevision} / ${mesh?.fieldRevision ?? "—"}`,
    },
    {
      label: "Generation muốn / đang vẽ",
      value: `${session.requestedGeneration} / ${mesh?.generation ?? "—"}`,
    },
    {
      label: "Trạng thái",
      value: `${session.paused ? "PAUSE · " : ""}${job?.phase ?? "idle"} · ${session.current ? "current" : "last-good/chưa có mesh"}`,
    },
    {
      label: "Count / emit cells",
      value: `${format(job?.countedCells ?? 0)} / ${format(job?.emittedCells ?? 0)} · job này`,
    },
    { label: "Mesh đang vẽ: active cells", value: format(mesh?.activeCells ?? 0) },
    {
      label: "Vertices / triangles đang vẽ",
      value: `${format(mesh?.vertices.length ?? 0)} / ${format((mesh?.vertices.length ?? 0) / 3)}`,
    },
    {
      label: "Chunk xử lý / reuse",
      value: `${mesh?.processedChunks ?? "—"} / ${mesh?.reusedChunks ?? "—"} (mesh đang vẽ)`,
    },
    {
      label: "Changed writes / queued stamps",
      value: `${format(session.changedWrites)} / ${session.queuedStamps}`,
    },
    { label: "Probe world", value: `(${[point.x, point.y, point.z].map(format).join("; ")})` },
    {
      label: "F(probe) / isovalue",
      value: `${format(session.grid.sample(point))} / ${format(session.isovalue)}`,
    },
    {
      label: "Degenerate / normal fallback",
      value: `${mesh?.degenerate ?? 0} / ${mesh?.normalFallbacks ?? 0}`,
    },
  ];
  const chunk = job?.chunks[Math.min(view.selectedChunk, job.chunks.length - 1)];
  const rows =
    chunk?.cells
      .map((cell, index) => ({ cell, index }))
      .filter((row) => chunk.counts[row.index] > 0)
      .slice(0, 8) ?? [];
  return (
    <>
      <LabReadout items={items} />
      {session.notice && (
        <p role="status" className="lab-note">
          {session.notice}
        </p>
      )}
      {view.inspect && chunk && (
        <div style={{ overflowX: "auto" }}>
          <p>
            Chunk {chunk.id} · generation {job?.generation} · {job?.phase}. Dưới đây là tối đa tám
            cell có mặt; offset là prefix riêng của chunk. Khi còn count, các dòng chưa xử lý chưa
            có kết quả.
          </p>
          <table>
            <thead>
              <tr>
                <th>Cell ID (x; y; z)</th>
                <th>Count vertices</th>
                <th>Offset bắt đầu</th>
                <th>Offset kết thúc</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ cell, index }) => (
                <tr key={cell.id}>
                  <td>
                    {cell.id} ({cell.x}; {cell.y}; {cell.z})
                  </td>
                  <td>{chunk.counts[index]}</td>
                  <td>{job?.phase === "count" ? "chờ scan" : chunk.offsets[index]}</td>
                  <td>{job?.phase === "count" ? "chờ scan" : chunk.offsets[index + 1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p>
              Chunk này chưa có cell cắt mặt hoặc chưa được count. Dùng “Chọn chunk có bề mặt” sau
              khi count.
            </p>
          )}
        </div>
      )}
    </>
  );
}
