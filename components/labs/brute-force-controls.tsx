import { bruteCounts, bruteSeeds, type BruteScene } from "@/lib/labs/brute-force-scene";
import { particleInsideCircleWithDistance } from "@/lib/labs/brute-force-particle-query";
import { LabReadout } from "./lab-shared";
import styles from "./brute-force-controls.module.css";

export function BruteControls({
  scene,
  reduced,
  edit,
  run,
  stop,
  step,
  toggle,
  reset,
  debug,
}: {
  scene: BruteScene;
  reduced: boolean;
  edit: (key: "count" | "seed" | "radius" | "scanLimit", value: number) => void;
  run: (scaling: boolean) => void;
  stop: () => void;
  step: () => void;
  toggle: () => void;
  reset: () => void;
  debug: () => void;
}) {
  if (!scene.debug)
    return (
      <div className="lab-controls">
        <button type="button" onClick={toggle} disabled={reduced}>
          {scene.paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={stop}>
          Dừng / hủy job
        </button>
        <button type="button" onClick={debug}>
          Hiện debug
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
    );
  return (
    <div className="lab-controls">
      <label>
        Số hạt
        <select
          aria-label="Số hạt"
          value={scene.count}
          onChange={(e) => edit("count", Number(e.target.value))}
        >
          {bruteCounts.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString("vi-VN")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Seed
        <select
          aria-label="Seed"
          value={scene.seed}
          onChange={(e) => edit("seed", Number(e.target.value))}
        >
          {bruteSeeds.map((n) => (
            <option key={n} value={n}>
              {n.toString(16).toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      {scene.stage >= 2 && (
        <label>
          Bán kính R
          <input
            aria-label="Bán kính R"
            type="range"
            min="0"
            max="0.35"
            step="0.005"
            value={scene.query.radius}
            onChange={(e) => edit("radius", Number(e.target.value))}
          />
          <output>{scene.query.radius.toFixed(3)}</output>
        </label>
      )}
      {scene.stage === 3 && (
        <label>
          Số hạt đã quét
          <input
            aria-label="Số hạt đã quét"
            type="range"
            min="0"
            max={scene.count}
            step={scene.count / 10}
            value={scene.scanLimit}
            onChange={(e) => edit("scanLimit", Number(e.target.value))}
          />
        </label>
      )}
      {scene.stage >= 7 && (
        <button type="button" onClick={toggle} disabled={reduced}>
          {scene.paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
      )}
      {(scene.stage === 3 || scene.stage >= 7) && (
        <button type="button" onClick={step}>
          Tiến một bước
        </button>
      )}
      {scene.stage >= 5 && (
        <button type="button" onClick={() => run(false)}>
          Chạy benchmark
        </button>
      )}
      {scene.stage >= 6 && (
        <button type="button" onClick={() => run(true)}>
          Chạy scaling
        </button>
      )}
      <button type="button" onClick={stop}>
        {scene.stage >= 5 ? "Dừng / hủy job" : "Tạm dừng"}
      </button>
      {scene.stage >= 7 && (
        <button type="button" onClick={debug}>
          {scene.debug ? "Ẩn debug" : "Hiện debug"}
        </button>
      )}
      <button type="button" onClick={reset}>
        Đặt lại
      </button>
    </div>
  );
}
const f = (n: number) => n.toLocaleString("vi-VN");
export function BruteReadout({ scene, capturing }: { scene: BruteScene; capturing: boolean }) {
  const items = [
    {
      label: "Dữ liệu / số điểm đã vẽ",
      value: f(scene.count) + " / " + f(scene.count) + " · không lấy mẫu",
    },
  ];
  if (scene.stage >= 2)
    items.push({
      label: "Tâm / bán kính",
      value: `(${scene.query.center.x.toFixed(3)}, ${scene.query.center.y.toFixed(3)}) / ${scene.query.radius.toFixed(3)}`,
    });
  if (scene.stage === 2)
    items.push({
      label: "Kiểm riêng hạt index 0",
      value: particleInsideCircleWithDistance(scene.particles[0], scene.query)
        ? "nằm trong hoặc trên vòng tròn"
        : "nằm ngoài vòng tròn",
    });
  if (scene.stage >= 3)
    items.push(
      {
        label: "Đã quét / hits",
        value: f(scene.result.scanned) + " / " + f(scene.result.hitIndices.length),
      },
      {
        label: "Thời gian query hiện tại",
        value: scene.queryMilliseconds.toFixed(4) + " ms · không gồm render",
      },
      {
        label: "Nearest index",
        value:
          scene.result.nearestIndex < 0
            ? "không có"
            : f(scene.result.nearestIndex) + " · tìm trong toàn prefix đã quét",
      },
    );
  if (scene.stage === 4)
    items.push({
      label: "Reference / squared distance",
      value: scene.referenceMatches ? "khớp toàn bộ hit indices và nearest" : "KHÔNG KHỚP",
    });
  if (scene.stage >= 5)
    items.push(
      {
        label: "Benchmark / checksum",
        value: scene.benchmark
          ? `${(scene.benchmark.elapsedMilliseconds / scene.benchmark.queryCount).toFixed(4)} ms/query · ${f(scene.benchmark.totalScanned)} scans · ${scene.benchmark.checksum.toString(16)}`
          : "chưa chạy",
      },
      {
        label: "Job hữu hạn",
        value: scene.job.active
          ? `dòng ${scene.job.row + 1} · warm-up ${scene.job.warmup}/24 · đo ${scene.job.cursor}/48`
          : "đã dừng",
      },
    );
  if (scene.stage >= 7)
    items.push({
      label: "Auto probe / pointer",
      value: (scene.paused ? "paused" : "running") + " / " + (capturing ? "đang kéo" : "đã nhả"),
    });
  else if (scene.stage >= 2)
    items.push({ label: "Pointer", value: capturing ? "đang kéo" : "đã nhả" });
  else items.push({ label: "Trạng thái", value: "Hạt đứng yên; bài này chưa chạy query." });
  return (
    <>
      <LabReadout items={scene.debug ? items : items.slice(0, 2)} />
      {scene.debug && scene.stage >= 6 && (
        <div className={styles.study}>
          <table aria-label="Bảng thời gian theo số hạt">
            <thead>
              <tr>
                <th>N</th>
                <th>Q</th>
                <th>N × Q / scans</th>
                <th>ms/query</th>
                <th>Checksum</th>
              </tr>
            </thead>
            <tbody>
              {scene.rows.map((row) => (
                <tr key={row.particleCount}>
                  <td>{f(row.particleCount)}</td>
                  <td>{row.queryCount}</td>
                  <td>{f(row.totalScanned)}</td>
                  <td>{(row.elapsedMilliseconds / row.queryCount).toFixed(4)}</td>
                  <td>{row.checksum.toString(16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {scene.rows.length === 0 && (
            <p>
              Chưa đo. Chọn “Chạy scaling” để dùng cùng 24 query, mỗi query lặp hai lần, trên ba
              prefix 1.000 / 10.000 / 100.000 hạt.
            </p>
          )}
        </div>
      )}
      <p className="lab-hint">
        Mọi hạt đều được đưa lên ảnh; nhiều hạt có thể trùng pixel. Các hạt đứng yên.
        {scene.stage >= 3 &&
          " Xám là toàn bộ dữ liệu, vàng là mọi hit, đỏ là hạt gần tâm nhất kể cả ngoài bán kính."}
        {scene.stage >= 5 && " Thời gian là số đo của máy hiện tại, không bị ép tăng tuyến tính."}
        {scene.stage >= 4 &&
          " JavaScript dùng lại mảng nhưng không có bảo đảm reserve/capacity như std::vector trong C++."}
      </p>
    </>
  );
}
