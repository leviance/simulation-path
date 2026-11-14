import { chunksPerAxis } from "@/lib/labs/volume-sculptor/brush";
import type { Shape } from "@/lib/labs/volume-sculptor/grid";
import type { SculptSession } from "@/lib/labs/volume-sculptor/session";
import type { SliceAxis, VolumeMode, VolumeView } from "@/lib/labs/volume-sculptor/view";

interface Props {
  mode: VolumeMode;
  session: SculptSession;
  view: VolumeView;
  onView: (patch: Partial<VolumeView>) => void;
  onAction: (action: () => void) => void;
  onReset: () => void;
  onStamp: () => void;
}

export function VolumeControls({ mode, session, view, onView, onAction, onReset, onStamp }: Props) {
  const lastChunk = chunksPerAxis(session.grid.spec) ** 3 - 1;
  function demonstrate(kind: "drill" | "bridge") {
    // Change the view first: changing a slice cancels the OLD pointer owner,
    // not the queued demonstration stroke we are about to create.
    onView({
      slice: { axis: "Z", layer: 0.5, u: 0.5, v: 0.5 },
      brush:
        kind === "drill"
          ? { mode: "subtract", radius: 0.4, strength: 0.8 }
          : { mode: "add", radius: 0.3, strength: 0.2 },
      camera: {
        ...view.camera,
        target: { x: 0, y: 0.05, z: 0 },
        zoom: 1.55,
        yaw: kind === "drill" ? -Math.PI / 2 : -0.78,
        pitch: kind === "drill" ? 0.12 : 0.4,
      },
    });
    onAction(() => session.demonstrateProduct(kind));
  }
  return (
    <>
      <div className="lab-controls">
        <label>
          Khối khởi đầu
          <select
            value={session.shape}
            onChange={(event) => onAction(() => session.reset(event.target.value as Shape))}
          >
            <option value="sphere">Mặt cầu</option>
            <option value="separatedSpheres">Hai khối rời</option>
            <option value="torus">Vòng torus</option>
          </select>
        </label>
        <label>
          Grid CPU
          <select
            value={session.grid.spec.samples}
            onChange={(event) =>
              onAction(() => session.changeResolution(Number(event.target.value)))
            }
          >
            {[12, 24, 32].map((samples) => (
              <option key={samples} value={samples}>
                {samples}³ samples
              </option>
            ))}
          </select>
        </label>
        <label>
          Isovalue: {session.isovalue.toFixed(2)}
          <input
            aria-label="Isovalue"
            type="range"
            min={-0.3}
            max={0.3}
            step={0.01}
            value={session.isovalue}
            onChange={(event) =>
              onAction(() => session.setIsovalue(event.currentTarget.valueAsNumber))
            }
          />
        </label>
        <label>
          Hướng lát cắt
          <select
            value={view.slice.axis}
            onChange={(event) =>
              onView({ slice: { ...view.slice, axis: event.target.value as SliceAxis } })
            }
          >
            <option value="X">X · mặt YZ</option>
            <option value="Y">Y · mặt ZX</option>
            <option value="Z">Z · mặt XY</option>
          </select>
        </label>
        <label>
          Vị trí lát cắt: {view.slice.layer.toFixed(2)}
          <input
            aria-label="Vị trí lát cắt"
            type="range"
            min={0}
            max={1}
            step={1 / (session.grid.spec.samples - 1)}
            value={view.slice.layer}
            onChange={(event) =>
              onView({ slice: { ...view.slice, layer: event.currentTarget.valueAsNumber } })
            }
          />
        </label>
        <label>
          Cọ
          <select
            value={view.brush.mode}
            onChange={(event) =>
              onView({
                brush: { ...view.brush, mode: event.target.value === "add" ? "add" : "subtract" },
              })
            }
          >
            <option value="subtract">Bớt vật liệu</option>
            <option value="add">Thêm vật liệu</option>
          </select>
        </label>
        <label>
          Radius: {view.brush.radius.toFixed(2)}
          <input
            aria-label="Brush radius"
            type="range"
            min={0.15}
            max={0.6}
            step={0.01}
            value={view.brush.radius}
            onChange={(event) =>
              onView({ brush: { ...view.brush, radius: event.currentTarget.valueAsNumber } })
            }
          />
        </label>
        <label>
          Strength: {view.brush.strength.toFixed(2)}
          <input
            aria-label="Brush strength"
            type="range"
            min={0.05}
            max={0.8}
            step={0.01}
            value={view.brush.strength}
            onChange={(event) =>
              onView({ brush: { ...view.brush, strength: event.currentTarget.valueAsNumber } })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={session.gradientNormals}
            onChange={(event) => onAction(() => session.setGradientNormals(event.target.checked))}
          />
          Gradient normal
        </label>
        {(["wireframe", "normals", "chunkBoxes", "inspect"] as const).map((flag) => (
          <label className="check" key={flag}>
            <input
              type="checkbox"
              checked={view[flag]}
              onChange={(event) => onView({ [flag]: event.target.checked })}
            />
            {
              {
                wireframe: "Wireframe",
                normals: "Vẽ normal",
                chunkBoxes: "Hộp chunk (x-ray)",
                inspect: "Count / prefix inspector",
              }[flag]
            }
          </label>
        ))}
        <button
          type="button"
          disabled={session.paused || session.strokeOwner !== null}
          onClick={onStamp}
        >
          Đặt một stamp tại probe · B
        </button>
        <button
          type="button"
          disabled={!session.undoCount || session.paused || session.strokeOwner !== null}
          onClick={() => onAction(() => session.undo())}
        >
          Undo · Z ({session.undoCount}/4)
        </button>
        <button
          type="button"
          disabled={!session.redoCount || session.paused || session.strokeOwner !== null}
          onClick={() => onAction(() => session.redo())}
        >
          Redo · Y ({session.redoCount})
        </button>
        <button
          type="button"
          aria-pressed={session.paused}
          onClick={() =>
            onAction(() => {
              session.paused = !session.paused;
            })
          }
        >
          {session.paused ? "Tiếp tục cập nhật" : "Pause cập nhật"}
        </button>
        <button
          type="button"
          disabled={!session.needsWork}
          onClick={() =>
            onAction(() => {
              session.paused = true;
              session.advance(true);
            })
          }
        >
          Chạy một batch
        </button>
        <button
          type="button"
          disabled={!session.needsWork && session.strokeOwner === null}
          onClick={() => onAction(() => session.cancelRemesh())}
        >
          Hủy cập nhật · C
        </button>
        <button type="button" onClick={() => onAction(() => session.requestRemesh(true))}>
          Dựng lại toàn grid · Enter
        </button>
        <button type="button" onClick={onReset}>
          Reset lab
        </button>
      </div>
      {(view.inspect || view.chunkBoxes) && (
        <div className="lab-controls">
          <label>
            Chunk đang xem: {Math.min(view.selectedChunk, lastChunk)} / {lastChunk}
            <input
              aria-label="Chunk đang xem"
              type="range"
              min={0}
              max={lastChunk}
              step={1}
              value={Math.min(view.selectedChunk, lastChunk)}
              onChange={(event) => onView({ selectedChunk: event.currentTarget.valueAsNumber })}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const chunks = session.job?.chunks ?? session.lastGood?.chunks ?? [];
              const next =
                chunks.find(
                  (chunk) =>
                    chunk.id > view.selectedChunk && chunk.counts.some((count) => count > 0),
                ) ?? chunks.find((chunk) => chunk.counts.some((count) => count > 0));
              if (next) onView({ selectedChunk: next.id });
            }}
          >
            Chọn chunk có bề mặt
          </button>
          <label>
            Capacity cho thí nghiệm lỗi
            <select
              value={session.capacity}
              onChange={(event) => onAction(() => session.setCapacity(Number(event.target.value)))}
            >
              <option value={98304}>98.304 vertices</option>
              <option value={12}>Chỉ 12 vertices — sẽ bị từ chối</option>
            </select>
          </label>
        </div>
      )}
      {(mode === "archive" || mode === "validation") && (
        <div className="lab-controls">
          <button
            type="button"
            disabled={session.strokeOwner !== null}
            onClick={() => onAction(() => session.saveSnapshot())}
          >
            Giữ snapshot trong RAM
          </button>
          <button
            type="button"
            disabled={!session.saved}
            onClick={() => onAction(() => session.restoreSnapshot())}
          >
            Khôi phục snapshot RAM
          </button>
          <button type="button" onClick={() => demonstrate("drill")}>
            Chạy nét cọ khoét xuyên cầu
          </button>
          <button type="button" onClick={() => demonstrate("bridge")}>
            Chạy nét cọ nối hai khối
          </button>
        </div>
      )}
    </>
  );
}
