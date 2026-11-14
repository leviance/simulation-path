import { useId, useState, type FormEvent } from "react";
import { orbitals, type OrbitalId } from "@/lib/labs/atomic-playground/catalog";
import {
  decodeConfig,
  encodeConfig,
  tableResolutions,
  type AtomicSession,
  type CloudConfig,
} from "@/lib/labs/atomic-playground/session";
import type { AtomicMode, AtomicView } from "@/lib/labs/atomic-playground/view";

interface Props {
  mode: AtomicMode;
  session: AtomicSession;
  view: AtomicView;
  hasWork: boolean;
  onRequest: (patch: Partial<CloudConfig>) => void;
  onView: (patch: Partial<AtomicView>) => void;
  onAction: (action: () => void) => void;
  onReset: () => void;
  onFit: () => void;
  onPause: () => void;
  onStep: () => void;
  onCancel: () => void;
}
export function AtomicControls({
  mode,
  session,
  view,
  hasWork,
  onRequest,
  onView,
  onAction,
  onReset,
  onFit,
  onPause,
  onStep,
  onCancel,
}: Props) {
  const prefix = useId(),
    config = session.requested;
  const [configurationText, setConfigurationText] = useState("");
  const advanced = mode !== "field";
  const sampling = ["measure", "cdf", "validation"].includes(mode);
  const appearance = ["splats", "clip", "probe", "compare", "config", "validation"].includes(mode);
  const clipping = ["clip", "probe", "compare", "config", "validation"].includes(mode);
  const probing = ["probe", "compare", "config", "validation"].includes(mode);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onRequest({ count: Number(data.get("count")), seed: Number(data.get("seed")) });
  }
  return (
    <>
      <div className="lab-controls">
        <label htmlFor={`${prefix}-orbital`}>
          Orbital A{" "}
          <select
            id={`${prefix}-orbital`}
            value={config.orbital}
            onChange={(event) => onRequest({ orbital: event.target.value as OrbitalId })}
          >
            {orbitals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onPause} aria-pressed={session.paused}>
          {session.paused ? "Tiếp tục sinh" : "Pause sinh mẫu"}
        </button>
        <button type="button" onClick={onStep} disabled={!hasWork}>
          Chạy một batch
        </button>
        <button type="button" onClick={onCancel} disabled={!hasWork}>
          Hủy candidate · C
        </button>
        <button type="button" onClick={onReset}>
          Reset cùng seed · R
        </button>
        <button type="button" onClick={onFit}>
          Reset góc nhìn · Home
        </button>
      </div>
      {advanced && (
        <form onSubmit={submit} className="lab-controls">
          <label htmlFor={`${prefix}-count`}>
            N CPU{" "}
            <input
              key={`n-${config.count}`}
              id={`${prefix}-count`}
              name="count"
              type="number"
              min={256}
              max={20000}
              step={1}
              defaultValue={config.count}
              style={{ width: 95 }}
            />
          </label>
          <label htmlFor={`${prefix}-seed`}>
            Seed uint32{" "}
            <input
              key={`s-${config.seed}`}
              id={`${prefix}-seed`}
              name="seed"
              type="number"
              min={0}
              max={4294967295}
              step={1}
              defaultValue={config.seed}
              style={{ width: 120 }}
            />
          </label>
          <button type="submit">Sinh cloud từ N/seed</button>
        </form>
      )}
      {sampling && (
        <div className="lab-controls">
          <label htmlFor={`${prefix}-sampling`}>
            Sampler{" "}
            <select
              id={`${prefix}-sampling`}
              value={config.sampling}
              onChange={(event) =>
                onRequest({ sampling: event.target.value as CloudConfig["sampling"] })
              }
            >
              <option value="weighted">Weighted CDF · đúng field</option>
              <option value="uniformRadius">Sandbox sai: radius đều</option>
              <option value="uniformAngle">Sandbox sai: theta đều</option>
            </select>
          </label>
          <span>Hai mode sai chỉ thay sampler trong lab nhỏ, không thay công thức density.</span>
        </div>
      )}
      {["measure", "cdf", "validation"].includes(mode) && (
        <div className="lab-controls">
          {(["radialBins", "muBins", "phiBins"] as const).map((key) => (
            <label key={key} htmlFor={`${prefix}-${key}`}>
              {key === "radialBins" ? "Số bin r" : key === "muBins" ? "Số bin μ" : "Số bin φ"}{" "}
              <select
                id={`${prefix}-${key}`}
                value={config[key]}
                onChange={(event) => onRequest({ [key]: Number(event.target.value) })}
              >
                {tableResolutions[key].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <span>
            Midpoint + jitter cho một PDF rời rạc xấp xỉ. Đổi bảng giữ N/seed nhưng tạo candidate
            mới; so histogram/reference sau khi cloud được nhận.
          </span>
        </div>
      )}
      {appearance && (
        <div className="lab-controls">
          <label htmlFor={`${prefix}-opacity`}>
            Opacity{" "}
            <input
              id={`${prefix}-opacity`}
              type="range"
              min={0.02}
              max={0.4}
              step={0.01}
              value={view.opacity}
              onChange={(event) => onView({ opacity: Number(event.target.value) })}
            />{" "}
            {view.opacity.toFixed(2)}
          </label>
          <label htmlFor={`${prefix}-size`}>
            Splat size{" "}
            <input
              id={`${prefix}-size`}
              type="range"
              min={0.7}
              max={4}
              step={0.1}
              value={view.size}
              onChange={(event) => onView({ size: Number(event.target.value) })}
            />{" "}
            {view.size.toFixed(1)} px
          </label>
          <label htmlFor={`${prefix}-palette`}>
            Palette{" "}
            <select
              id={`${prefix}-palette`}
              value={view.palette}
              onChange={(event) => onView({ palette: event.target.value as AtomicView["palette"] })}
            >
              <option value="phase">Dấu amplitude: xanh − / cam +</option>
              <option value="cyan">Xanh đồng nhất</option>
              <option value="warm">Cam đồng nhất</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={view.densityBoost}
              onChange={(event) => onView({ densityBoost: event.target.checked })}
            />{" "}
            Density boost √(ρ/ρ_max) · chỉ hiển thị
          </label>
        </div>
      )}
      {clipping && (
        <div className="lab-controls">
          <label>
            <input
              type="checkbox"
              checked={view.clip.enabled}
              onChange={(event) =>
                onView({ clip: { ...view.clip, enabled: event.target.checked } })
              }
            />{" "}
            Mặt cắt · P
          </label>
          <label htmlFor={`${prefix}-axis`}>
            Trục cắt{" "}
            <select
              id={`${prefix}-axis`}
              value={view.clip.axis}
              onChange={(event) =>
                onView({
                  clip: { ...view.clip, axis: event.target.value as AtomicView["clip"]["axis"] },
                })
              }
            >
              <option value="x">X</option>
              <option value="y">Y</option>
              <option value="z">Z</option>
            </select>
          </label>
          <label htmlFor={`${prefix}-clip`}>
            Giữ tọa độ ≤{" "}
            <input
              id={`${prefix}-clip`}
              type="range"
              min={-40}
              max={40}
              step={0.1}
              value={view.clip.position}
              onChange={(event) =>
                onView({ clip: { ...view.clip, position: Number(event.target.value) } })
              }
            />{" "}
            {view.clip.position.toFixed(1)} a₀
          </label>
        </div>
      )}
      {probing && (
        <div className="lab-controls">
          <label>
            <input
              type="checkbox"
              checked={view.showProbe}
              onChange={(event) => onView({ showProbe: event.target.checked })}
            />{" "}
            Vùng đo hình cầu
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} htmlFor={`${prefix}-probe-${axis}`}>
              Tâm {axis.toUpperCase()}{" "}
              <input
                id={`${prefix}-probe-${axis}`}
                type="range"
                min={-20}
                max={20}
                step={0.25}
                value={view.probe.center[axis]}
                onChange={(event) =>
                  onView({
                    probe: {
                      ...view.probe,
                      center: { ...view.probe.center, [axis]: Number(event.target.value) },
                    },
                  })
                }
              />{" "}
              {view.probe.center[axis].toFixed(2)}
            </label>
          ))}
          <label htmlFor={`${prefix}-radius`}>
            Bán kính vùng{" "}
            <input
              id={`${prefix}-radius`}
              type="range"
              min={0.25}
              max={30}
              step={0.25}
              value={view.probe.radius}
              onChange={(event) =>
                onView({ probe: { ...view.probe, radius: Number(event.target.value) } })
              }
            />{" "}
            {view.probe.radius.toFixed(2)} a₀
          </label>
        </div>
      )}
      {["compare", "config", "validation"].includes(mode) && (
        <div className="lab-controls">
          <label>
            <input
              type="checkbox"
              checked={view.compare}
              onChange={(event) => onView({ compare: event.target.checked })}
            />{" "}
            So hai cloud cùng thang a₀
          </label>
          <label htmlFor={`${prefix}-secondary`}>
            Orbital B{" "}
            <select
              id={`${prefix}-secondary`}
              value={view.secondary}
              onChange={(event) => onView({ secondary: event.target.value as OrbitalId })}
            >
              {orbitals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="lab-controls">
        <label>
          <input
            type="checkbox"
            checked={view.inspect}
            onChange={(event) => onView({ inspect: event.target.checked })}
          />{" "}
          Hiện bảng kiểm và histogram
        </label>
      </div>
      {["config", "validation"].includes(mode) && (
        <details>
          <summary>JSON cấu hình nhỏ: preset/N/seed/sampler</summary>
          <div className="lab-controls">
            <button type="button" onClick={() => setConfigurationText(encodeConfig(config))}>
              Xuất cấu hình JSON
            </button>
            <button
              type="button"
              onClick={() => onAction(() => onRequest(decodeConfig(configurationText)))}
            >
              Nạp cấu hình JSON
            </button>
          </div>
          <label htmlFor={`${prefix}-json`}>JSON tối đa 2 KiB, không chứa point cloud</label>
          <textarea
            id={`${prefix}-json`}
            value={configurationText}
            maxLength={2048}
            onChange={(event) => setConfigurationText(event.target.value)}
            rows={6}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </details>
      )}
    </>
  );
}
