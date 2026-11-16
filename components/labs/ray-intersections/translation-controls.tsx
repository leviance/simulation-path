import type { Vec3 } from "@/lib/labs/ray-intersections";

export function TranslationControls({
  label,
  disabled = false,
  move,
}: {
  label: string;
  disabled?: boolean;
  move: (delta: Vec3) => void;
}) {
  return (
    <fieldset className="lab-controls" disabled={disabled}>
      <legend>{label} — mỗi lần 0,1 đơn vị world</legend>
      {(["x", "y", "z"] as const).flatMap((axis) =>
        [-1, 1].map((sign) => (
          <button
            type="button"
            key={axis + sign}
            aria-label={`${label} ${axis.toUpperCase()}${sign < 0 ? "−" : "+"}`}
            onClick={() => move({ x: 0, y: 0, z: 0, [axis]: sign * 0.1 })}
          >
            {axis.toUpperCase()}
            {sign < 0 ? "−" : "+"}
          </button>
        )),
      )}
    </fieldset>
  );
}
