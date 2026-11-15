"use client";
import { presets, type Layer, type Potential, type Preset } from "@/lib/labs/wind-map/model";
import type { WindSession } from "@/lib/labs/wind-map/session";

const labels: Record<Preset, string> = {
  uniform: "Gió đều: (1; 0,25)",
  source: "Tỏa ra: (x; y)",
  sink: "Hút vào: (−x; −y)",
  rotation: "Xoay: (−y; x)",
  shear: "Trượt: (y; 0)",
  gradient: "Vận tốc = gradient φ",
};
export function WindControls({
  app,
  reducedMotion,
  invoke,
}: {
  app: WindSession;
  reducedMotion: boolean;
  invoke: (action: () => void) => void;
}) {
  const stage = app.stage;
  return (
    <div className="lab-controls">
      <label>
        Trường mẫu{" "}
        <select
          value={app.scene.preset}
          disabled={stage < 2}
          onChange={(e) => invoke(() => app.changeScene({ preset: e.target.value as Preset }))}
        >
          {presets
            .filter((p) => stage >= 3 || p !== "gradient")
            .map((p) => (
              <option key={p} value={p}>
                {labels[p]}
              </option>
            ))}
        </select>
      </label>
      {stage >= 3 && (
        <>
          <label>
            Trường scalar{" "}
            <select
              value={app.scene.potential}
              onChange={(e) =>
                invoke(() => app.changeScene({ potential: e.target.value as Potential }))
              }
            >
              <option value="bowl">Lòng chảo: φ = (x²+y²)/2</option>
              <option value="hill">Đỉnh đồi: φ = exp(−x²−y²)</option>
            </select>
          </label>
          <label>
            Lớp màu{" "}
            <select
              value={app.layer}
              onChange={(e) =>
                invoke(() => {
                  app.layer = e.target.value as Layer;
                })
              }
            >
              <option value="arrows">Chỉ mũi tên vận tốc</option>
              <option value="potential">Scalar φ / mũi tên vận tốc</option>
              <option value="gradient">Gradient φ / độ lớn gradient</option>
              {stage >= 4 && <option value="divergence">Divergence của vận tốc</option>}
              {stage >= 5 && <option value="curl">Curl z của vận tốc</option>}
            </select>
          </label>
        </>
      )}
      {stage >= 6 && (
        <label>
          Độ phân giải{" "}
          <select
            value={app.field.width}
            onChange={(e) => invoke(() => app.resolution(Number(e.target.value)))}
          >
            <option value={33}>33 × 25 — lưới học</option>
            <option value={65}>65 × 49 — bản hoàn chỉnh</option>
            <option value={129}>129 × 97 — tinh lưới</option>
          </select>
        </label>
      )}
      {stage >= 7 && (
        <>
          <label>
            FPS hiển thị tối đa{" "}
            <select
              value={app.fps}
              onChange={(e) =>
                invoke(() => {
                  app.pause();
                  app.fps = Number(e.target.value);
                })
              }
            >
              {[15, 30, 60].map((fps) => (
                <option key={fps} value={fps}>
                  {fps}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={app.tracers}
              onChange={() => invoke(() => app.toggleTracers())}
            />{" "}
            Hạt đánh dấu
          </label>
        </>
      )}
      {stage >= 8 && (
        <>
          <label>
            Thao tác chuột{" "}
            <select
              value={app.editVortex ? "vortex" : "probe"}
              onChange={(e) =>
                invoke(() => {
                  app.editVortex = e.target.value === "vortex";
                })
              }
            >
              <option value="probe">Đọc số tại nút</option>
              <option value="vortex">Đặt/kéo tâm xoáy</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={app.scene.vortex}
              onChange={(e) => invoke(() => app.changeScene({ vortex: e.target.checked }))}
            />{" "}
            Xoáy cục bộ
          </label>
          <label>
            Chiều xoáy{" "}
            <select
              value={app.scene.strength}
              onChange={(e) => invoke(() => app.changeScene({ strength: Number(e.target.value) }))}
            >
              <option value={2}>Ngược kim đồng hồ</option>
              <option value={-2}>Cùng kim đồng hồ</option>
            </select>
          </label>
        </>
      )}
      <label>
        <input
          type="checkbox"
          checked={app.clean}
          onChange={() =>
            invoke(() => {
              app.clean = !app.clean;
            })
          }
        />{" "}
        Xem sạch
      </label>
      <button
        type="button"
        disabled={stage < 7 || reducedMotion || !app.tracers}
        onClick={() =>
          invoke(() => {
            if (app.paused) app.resume();
            else app.pause();
          })
        }
      >
        {app.paused ? "Chạy" : "Tạm dừng"}
      </button>
      <button
        type="button"
        disabled={stage < 7 || !app.tracers}
        onClick={() =>
          invoke(() => {
            app.pause();
            app.step();
          })
        }
      >
        Tiến một bước
      </button>
      <button type="button" onClick={() => invoke(() => app.reset())}>
        Đặt lại
      </button>
      {stage >= 9 && (
        <button type="button" onClick={() => invoke(() => app.verify())}>
          Kiểm chứng trường chuẩn
        </button>
      )}
    </div>
  );
}
