"use client";
import { useEffect } from "react";
import type { MapScene } from "@/lib/labs/map-scene";
import { viewportBox } from "@/lib/labs/map-geometry";
import { createMapValidation, tickMapValidation } from "@/lib/labs/map-validation";
import { createMapBenchmark, tickMapBenchmark } from "@/lib/labs/map-benchmark";

interface Props {
  scene: MapScene;
  getScene: () => MapScene;
  publish: () => void;
  stop: () => void;
}
export default function MapEditorDiagnostics({ scene, getScene, publish, stop }: Props) {
  const busy = !!scene.validation?.active || !!scene.benchmark?.active;
  useEffect(() => {
    if (!busy) return;
    let frame = 0;
    const tick = () => {
      const current = getScene();
      if (current.validation?.active) tickMapValidation(current.validation);
      else if (current.benchmark?.active) tickMapBenchmark(current.benchmark);
      publish();
      if (current.validation?.active || current.benchmark?.active)
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [busy, publish, getScene]);

  const validate = () => {
    stop();
    const current = getScene();
    const boxes = [viewportBox(current.camera, current.size)];
    if (current.document.selectionBox) boxes.push(current.document.selectionBox);
    current.validation = createMapValidation(current.document.tree, boxes);
    publish();
  };
  const benchmark = () => {
    stop();
    const current = getScene();
    current.benchmark = createMapBenchmark(
      current.document.tree,
      viewportBox(current.camera, current.size),
    );
    publish();
  };
  return (
    <>
      <div className="lab-controls" aria-label="Kiểm chứng và đo hiệu năng">
        <button type="button" onClick={validate}>
          Kiểm reference và topology
        </button>
        {scene.stage >= 10 && (
          <button type="button" onClick={benchmark}>
            Đo query Tree / Brute
          </button>
        )}
      </div>
      {scene.validation && (
        <p role="status">
          Reference: {scene.validation.checked}/{scene.validation.boxes.length} query ·{" "}
          {scene.validation.failures} lỗi · topology {scene.validation.topology.failures} lỗi ·{" "}
          {scene.validation.stale
            ? "dataset đã đổi"
            : scene.validation.active
              ? "đang kiểm"
              : scene.validation.checked === scene.validation.boxes.length
                ? "hoàn tất"
                : "đã dừng"}
          .
        </p>
      )}
      {scene.benchmark?.active && (
        <p role="status">
          Đang đo {scene.benchmark.method}: lượt {scene.benchmark.iteration + 1}/7, query{" "}
          {scene.benchmark.queryIndex + 1}/16. Hai warm-up, năm mẫu; hủy bằng Escape.
        </p>
      )}
      {!!scene.benchmark?.rows.length && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>
              Cùng dataset và 16 query cố định. Index build/update báo riêng; checksum không thay
              reference check.
            </caption>
            <thead>
              <tr>
                <th>Method</th>
                <th>N</th>
                <th>Mẫu</th>
                <th>Batch median [min–max] ms</th>
                <th>Candidate/batch</th>
                <th>Checksum</th>
              </tr>
            </thead>
            <tbody>
              {scene.benchmark.rows.map((row) => (
                <tr key={row.method}>
                  <td>{row.method}</td>
                  <td>{row.objects}</td>
                  <td>{row.samples}</td>
                  <td>
                    {row.medianMs.toFixed(2)} [{row.minMs.toFixed(2)}–{row.maxMs.toFixed(2)}]
                  </td>
                  <td>{row.candidates}</td>
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
