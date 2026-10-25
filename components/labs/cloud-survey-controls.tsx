import type { ChangeEvent } from "react";
import type { CloudScene } from "@/lib/labs/cloud-survey/scene";
import type { Vec3 } from "@/lib/labs/cloud-survey/geometry";

interface Props {
  scene: CloudScene;
  tool: "orbit" | "pan";
  setTool: (tool: "orbit" | "pan") => void;
  change: (action: (scene: CloudScene) => void) => void;
  preset: (count: number, uniform: boolean) => void;
  reset: () => void;
  frame: () => void;
  cameraMode: () => void;
  open: (event: ChangeEvent<HTMLInputElement>) => void;
  exportCsv: () => void;
}
export function CloudSurveyControls({
  scene,
  tool,
  setTool,
  change,
  preset,
  reset,
  frame,
  cameraMode,
  open,
  exportCsv,
}: Props) {
  const stage = scene.stage;
  const update = (axis: keyof Vec3, value: string) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    change((s) => {
      s.region.center = { ...s.region.center, [axis]: Math.max(-10000, Math.min(10000, number)) };
      s.selectionEnabled = true;
    });
  };
  return (
    <>
      <div className="lab-controls">
        <label>
          Dataset{" "}
          <select
            aria-label="Preset point cloud"
            value={scene.origin}
            onChange={(event) =>
              preset(scene.count === 10000 ? 10000 : 100000, event.target.value === "uniform")
            }
          >
            <option value="room">Phòng và kệ hàng</option>
            <option value="uniform">Điểm đều trong thể tích</option>
            {scene.origin === "csv" && <option value="csv">CSV đã mở</option>}
          </select>
        </label>
        <label>
          Số điểm{" "}
          <select
            aria-label="Số điểm point cloud"
            value={[10000, 100000].includes(scene.count) ? scene.count : "imported"}
            onChange={(event) => preset(Number(event.target.value), scene.uniform)}
          >
            <option value="10000">10.000 — thử nhanh</option>
            <option value="100000">100.000 — nghiệm thu</option>
            {![10000, 100000].includes(scene.count) && (
              <option value="imported">{scene.count} — CSV đã mở</option>
            )}
          </select>
        </label>
        <button type="button" onClick={reset}>
          Đặt lại preset/CSV
        </button>
        <label>
          Mở CSV{" "}
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Mở CSV point cloud"
            onChange={open}
          />
        </label>
      </div>
      {stage >= 2 && (
        <div className="lab-controls">
          <label>
            Thao tác kéo{" "}
            <select
              aria-label="Thao tác camera"
              value={tool}
              onChange={(event) => setTool(event.target.value as "orbit" | "pan")}
            >
              <option value="orbit">Orbit / nhìn quanh</option>
              <option value="pan">Pan camera</option>
            </select>
          </label>
          <button type="button" onClick={cameraMode}>
            {scene.camera.freeFly ? "Đang dùng free-fly" : "Đang dùng orbit"}
          </button>
          <button type="button" onClick={frame}>
            Camera về toàn dataset
          </button>
        </div>
      )}
      {stage >= 3 && (
        <fieldset className="lab-controls">
          <legend>Vùng chọn trong world (mét)</legend>
          <label>
            Kiểu{" "}
            <select
              aria-label="Kiểu vùng chọn"
              value={scene.region.shape}
              onChange={(event) =>
                change((s) => {
                  s.region.shape = event.target.value as "box" | "sphere";
                  s.selectionEnabled = true;
                })
              }
            >
              <option value="box">Hộp</option>
              <option value="sphere">Cầu</option>
            </select>
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              Tâm {axis.toUpperCase()}{" "}
              <input
                aria-label={`Tâm vùng chọn ${axis.toUpperCase()}`}
                type="number"
                min="-10000"
                max="10000"
                step="0.5"
                value={scene.region.center[axis]}
                onChange={(event) => update(axis, event.target.value)}
              />
            </label>
          ))}
          <label>
            {scene.region.shape === "sphere" ? "Bán kính" : "Nửa cạnh"}{" "}
            <input
              aria-label="Kích thước vùng chọn"
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={scene.region.shape === "sphere" ? scene.region.radius : scene.region.half.x}
              onChange={(event) =>
                change((s) => {
                  const value = Number(event.target.value);
                  s.region.radius = value;
                  s.region.half = { x: value, y: value, z: value };
                  s.selectionEnabled = true;
                })
              }
            />
          </label>
          <button
            type="button"
            onClick={() =>
              change((s) => {
                s.selectionEnabled = true;
              })
            }
          >
            Chọn vùng hiện tại
          </button>
          <button
            type="button"
            onClick={() =>
              change((s) => {
                s.selectionEnabled = false;
              })
            }
          >
            Xóa selection
          </button>
          {stage >= 5 && (
            <button
              type="button"
              onClick={() =>
                change((s) => {
                  s.useTree = !s.useTree;
                })
              }
            >
              {scene.useTree ? "Đang dùng Octree" : "Đang dùng brute force"}
            </button>
          )}
        </fieldset>
      )}
      {stage >= 7 && (
        <fieldset className="lab-controls">
          <legend>Lọc chiều cao Y (mét)</legend>
          <label>
            Y nhỏ nhất{" "}
            <input
              aria-label="Chiều cao nhỏ nhất"
              type="number"
              min="-10000"
              max={scene.region.maximumHeight}
              step="0.25"
              value={scene.region.minimumHeight}
              onChange={(event) =>
                change((s) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value))
                    s.region.minimumHeight = Math.max(
                      -10000,
                      Math.min(s.region.maximumHeight, value),
                    );
                })
              }
            />
          </label>
          <label>
            Y lớn nhất{" "}
            <input
              aria-label="Chiều cao lớn nhất"
              type="number"
              min={scene.region.minimumHeight}
              max="10000"
              step="0.25"
              value={scene.region.maximumHeight}
              onChange={(event) =>
                change((s) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value))
                    s.region.maximumHeight = Math.min(
                      10000,
                      Math.max(s.region.minimumHeight, value),
                    );
                })
              }
            />
          </label>
          <button
            type="button"
            onClick={() =>
              change((s) => {
                s.region.minimumHeight = 0;
                s.region.maximumHeight = 0;
                s.region.center = { x: 0, y: 0, z: 0 };
                s.region.half = { x: 12, y: 0.1, z: 9 };
                s.region.shape = "box";
                s.selectionEnabled = true;
              })
            }
          >
            Chọn mặt sàn Y = 0
          </button>
          <button
            type="button"
            onClick={() =>
              change((s) => {
                s.region.minimumHeight = -10000;
                s.region.maximumHeight = 10000;
              })
            }
          >
            Bỏ lọc chiều cao
          </button>
        </fieldset>
      )}
      <div className="lab-controls">
        {stage >= 4 && (
          <label>
            <input
              type="checkbox"
              checked={scene.debug}
              onChange={(event) =>
                change((s) => {
                  s.debug = event.target.checked;
                })
              }
            />{" "}
            Hộp node debug (tối đa 2.048)
          </label>
        )}
        {stage >= 6 && (
          <label>
            <input
              type="checkbox"
              checked={scene.culling}
              onChange={(event) =>
                change((s) => {
                  s.culling = event.target.checked;
                })
              }
            />{" "}
            Frustum culling bằng Octree
          </label>
        )}
        {stage >= 8 && (
          <button type="button" onClick={exportCsv}>
            Xuất selection CSV
          </button>
        )}
      </div>
    </>
  );
}

export default CloudSurveyControls;
