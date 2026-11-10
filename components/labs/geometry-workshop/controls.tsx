import {
  maxUSegments,
  maxVSegments,
  minSweepSegments,
  shapeNames,
  thicknessLimit,
  usesSweep,
  type SurfaceKind,
  type SurfaceSettings,
} from "@/lib/labs/geometry-workshop/settings";
import type { GeometryMode, View } from "@/lib/labs/geometry-workshop/view";

type NumberField =
  | "patchHeight"
  | "radius"
  | "thickness"
  | "uSegments"
  | "vSegments"
  | "shellTurns"
  | "shellGrowth"
  | "sectionTurns";
type ViewFlag = "wireframe" | "uv" | "normals" | "seams" | "section" | "cullBack";
type Slider = { field: NumberField; label: string; min: number; max: number; step: number };

function slidersFor(mode: GeometryMode, settings: Readonly<SurfaceSettings>): Slider[] {
  const sliders: Slider[] = [];
  if (settings.kind === "patch") {
    sliders.push({
      field: "patchHeight",
      label: "Chiều cao mảnh mặt",
      min: 0,
      max: 1.6,
      step: 0.02,
    });
  } else {
    sliders.push(
      { field: "radius", label: "Bán kính đường tâm", min: 0.6, max: 4, step: 0.02 },
      {
        field: "thickness",
        label: settings.kind === "mobius" ? "Nửa bề rộng dải" : "Bán kính tiết diện",
        min: 0.04,
        max: Math.floor(thicknessLimit(settings.kind, settings.radius) * 100) / 100,
        step: 0.01,
      },
    );
  }
  if (mode === "topology" || mode === "preview" || mode === "showcase") {
    sliders.push(
      {
        field: "uSegments",
        label: "Số ô theo u",
        min: usesSweep(settings.kind) ? minSweepSegments : 8,
        max: maxUSegments,
        step: 1,
      },
      { field: "vSegments", label: "Số ô theo v", min: 4, max: maxVSegments, step: 1 },
    );
  }
  if (settings.kind === "shell") {
    sliders.push(
      { field: "shellTurns", label: "Số vòng của vỏ ốc", min: 1.25, max: 3.25, step: 0.05 },
      { field: "shellGrowth", label: "Growth · độ loe", min: 0.8, max: 2.5, step: 0.05 },
    );
  }
  if (usesSweep(settings.kind)) {
    sliders.push({
      field: "sectionTurns",
      label: "Số vòng xoắn tiết diện",
      min: -2,
      max: 2,
      step: settings.kind === "knot" ? 1 : 0.05,
    });
  }
  return sliders;
}

const flags: [ViewFlag, string][] = [
  ["wireframe", "Wireframe"],
  ["uv", "Màu UV"],
  ["normals", "Tangent / normal"],
  ["seams", "Đường nối"],
  ["section", "Lát cắt"],
  ["cullBack", "Bỏ mặt quay lưng"],
];

const surfacePresets = ["torus", "shell", "mobius", "knot"] as const;
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export interface GeometryControlsProps {
  mode: GeometryMode;
  settings: Readonly<SurfaceSettings>;
  view: View;
  held: boolean;
  paused: boolean;
  pending: boolean;
  spinning: boolean;
  reducedMotion: boolean;
  onGeometry: (patch: Partial<SurfaceSettings>) => void;
  onView: (patch: Partial<View>) => void;
  onChoose: (kind: SurfaceKind) => void;
  onControlDown: (pointerId: number) => void;
  onToggleHold: () => void;
  onTogglePause: () => void;
  onToggleSpin: () => void;
  onStep: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export function GeometryControls(props: GeometryControlsProps) {
  const { mode, settings, view } = props;
  const previews = mode === "preview" || mode === "showcase";
  const selection = mode === "patch" || mode === "topology" || mode === "export";
  return (
    <div className="lab-controls">
      {previews && (
        <label>
          Kiểu hình
          <select
            value={settings.kind}
            onChange={(event) => props.onChoose(event.target.value as SurfaceKind)}
          >
            {surfacePresets.map((kind) => (
              <option key={kind} value={kind}>
                {shapeNames[kind]}
              </option>
            ))}
          </select>
        </label>
      )}
      {slidersFor(mode, settings).map(({ field, label, min, max, step }) => (
        <label key={field}>
          {label}
          <output>{numberFormat.format(settings[field])}</output>
          <input
            aria-label={label}
            type="range"
            value={settings[field]}
            min={min}
            max={max}
            step={step}
            onPointerDown={(event) => {
              if (event.isPrimary && event.button === 0) props.onControlDown(event.pointerId);
            }}
            onChange={(event) => props.onGeometry({ [field]: event.currentTarget.valueAsNumber })}
          />
        </label>
      ))}
      {settings.kind === "mobius" && (
        <label>
          Số nửa vòng
          <select
            value={settings.halfTwists}
            onChange={(event) => props.onGeometry({ halfTwists: Number(event.target.value) })}
          >
            {[1, 3, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      )}
      {settings.kind === "knot" && (
        <label>
          Số múi của knot
          <select
            value={settings.knotLobes}
            onChange={(event) => props.onGeometry({ knotLobes: Number(event.target.value) })}
          >
            <option value={3}>Ba múi</option>
            <option value={5}>Năm múi</option>
          </select>
        </label>
      )}
      {(selection || usesSweep(settings.kind) || view.normals) && (
        <label>
          {usesSweep(settings.kind) ? "Vị trí lát cắt" : "Mốc theo u"}
          <input
            aria-label={usesSweep(settings.kind) ? "Vị trí lát cắt" : "Mốc theo u"}
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={view.probeU}
            onChange={(event) => props.onView({ probeU: event.currentTarget.valueAsNumber })}
          />
        </label>
      )}
      {(selection || view.seams || view.normals) && (
        <label>
          Mốc theo v
          <input
            aria-label="Mốc theo v"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={view.probeV}
            onChange={(event) => props.onView({ probeV: event.currentTarget.valueAsNumber })}
          />
        </label>
      )}
      {mode === "export" && (
        <>
          <label>
            Tam giác của ô
            <select
              value={view.faceHalf}
              onChange={(event) => props.onView({ faceHalf: event.target.value === "1" ? 1 : 0 })}
            >
              <option value={0}>Tam giác đầu</option>
              <option value={1}>Tam giác sau</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={!view.oneBased}
              onChange={(event) => props.onView({ oneBased: !event.target.checked })}
            />
            Thử bỏ +1
          </label>
        </>
      )}
      {mode === "topology" && (
        <label className="check">
          <input
            type="checkbox"
            checked={settings.reverseWinding}
            onChange={(event) => props.onGeometry({ reverseWinding: event.target.checked })}
          />
          Đảo chiều tam giác đầu
        </label>
      )}
      {mode === "knot" && (
        <label className="check">
          <input
            type="checkbox"
            checked={settings.correctKnotSeam}
            onChange={(event) => props.onGeometry({ correctKnotSeam: event.target.checked })}
          />
          Bù góc ở đường nối
        </label>
      )}
      {flags.map(([flag, label]) => {
        if (flag === "seams" && settings.kind === "patch") return null;
        if (flag === "section" && !usesSweep(settings.kind)) return null;
        if (flag === "cullBack" && mode !== "topology") return null;
        return (
          <label className="check" key={flag}>
            <input
              type="checkbox"
              checked={view[flag]}
              onChange={(event) => props.onView({ [flag]: event.target.checked })}
            />
            {label}
          </label>
        );
      })}
      {previews && (
        <>
          <button type="button" aria-pressed={props.held} onClick={props.onToggleHold}>
            {props.held ? "Buông để dựng" : "Giữ preview khi chỉnh"}
          </button>
          <button type="button" aria-pressed={props.paused} onClick={props.onTogglePause}>
            {props.paused ? "Tiếp tục làm mịn" : "Tạm dừng làm mịn"}
          </button>
          <button type="button" disabled={!props.pending} onClick={props.onStep}>
            Tiến một batch
          </button>
          <button type="button" disabled={!props.pending} onClick={props.onCancel}>
            Hủy bản đang dựng
          </button>
        </>
      )}
      <button
        type="button"
        aria-pressed={props.spinning}
        disabled={props.reducedMotion}
        onClick={props.onToggleSpin}
      >
        {props.spinning ? "Dừng xoay tự động" : "Tự xoay"}
      </button>
      <button type="button" onClick={props.onReset}>
        Đặt lại lab
      </button>
    </div>
  );
}
