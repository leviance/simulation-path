"use client";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { interpolationCell } from "@/lib/labs/voxel-procedural-terrain";
import { LabReadout, canvasPoint, setupCanvas, useCanvasSize } from "../lab-shared";

export function NoiseCell({ seed }: { seed: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId();
  const pointer = useRef<number | null>(null);
  const [cell, setCell] = useState({ x0: -1, z0: 0, tx: 0.75, tz: 0.5 });
  const [smoothWeights, setSmoothWeights] = useState(true);
  const sample = interpolationCell(cell.x0, cell.z0, cell.tx, cell.tz, seed, smoothWeights);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      release();
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [release]);
  useEffect(() => {
    release();
  }, [size.width, size.height, size.dpr, seed, release]);
  const side = Math.min(200, size.width - 48),
    left = 24,
    top = 40;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 12; column++) {
        const p = interpolationCell(
          cell.x0,
          cell.z0,
          (column + 0.5) / 12,
          (row + 0.5) / 12,
          seed,
          smoothWeights,
        );
        ctx.fillStyle = `hsl(${210 - p.n * 70} 50% ${30 + p.n * 12}%)`;
        ctx.fillRect(
          left + (column * side) / 12,
          top + (row * side) / 12,
          side / 12 + 0.5,
          side / 12 + 0.5,
        );
      }
    }
    const label = (text: string, x: number, y: number) => {
      ctx.fillStyle = "#e7edf8";
      ctx.font = "13px monospace";
      ctx.fillText(text, x, y);
    };
    label("v00", left, top - 12);
    label("v10", left + side - 24, top - 12);
    label("v01", left, top + side + 24);
    label("v11", left + side - 24, top + side + 24);
    const x = left + cell.tx * side,
      y = top + cell.tz * side;
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + side);
    ctx.moveTo(left, y);
    ctx.lineTo(left + side, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    label(`tx=${cell.tx.toFixed(3)} tz=${cell.tz.toFixed(3)}`, 24, 295);
  }, [size, cell, seed, smoothWeights, side]);
  const updatePoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(e, e.currentTarget);
    const tx = Math.max(0, Math.min(1, (p.x - left) / side));
    const tz = Math.max(0, Math.min(1, (p.y - top) / side));
    setCell((c) => ({ ...c, tx, tz }));
  };
  const reset = () => {
    release();
    setCell({ x0: -1, z0: 0, tx: 0.75, tz: 0.5 });
    setSmoothWeights(true);
  };
  return (
    <section
      className="interactive-lab"
      aria-label="Thí nghiệm nội suy bốn góc"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) release();
      }}
    >
      <h3>Thử phép nội suy trên một ô lattice</h3>
      <p id={help}>
        Seed đang dùng: {seed}. Kéo điểm trắng trong ô hoặc dùng các thanh tx/tz. Trộn v00/v10 thành
        a, v01/v11 thành b, rồi trộn a/b thành n. Đây là không gian noise, chưa phải world pixel
        hoặc số block.
      </p>
      <div className="lab-controls">
        <button type="button" onClick={reset}>
          Về mẫu (−0.25, 0.5)
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            setCell((c) => ({ ...c, tx: 0.5, tz: 0.5 }));
          }}
        >
          Tâm ô
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            setCell((c) => ({ ...c, tx: 0, tz: 0 }));
          }}
        >
          Góc v00
        </button>
        {(["x0", "z0"] as const).map((axis) => (
          <label key={axis}>
            Ô lattice {axis}
            <input
              type="number"
              min="-2"
              max="2"
              step="1"
              value={cell[axis]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isInteger(v) && Math.abs(v) <= 2) {
                  release();
                  setCell((c) => ({ ...c, [axis]: v }));
                }
              }}
            />
          </label>
        ))}
        {(["tx", "tz"] as const).map((axis) => (
          <label key={axis}>
            Phần lẻ {axis}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={cell[axis]}
              onChange={(e) => {
                release();
                setCell((c) => ({ ...c, [axis]: Number(e.target.value) }));
              }}
            />
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={smoothWeights}
            onChange={(e) => {
              release();
              setSmoothWeights(e.target.checked);
            }}
          />
          Dùng smoothstep cho trọng số
        </label>
      </div>
      <canvas
        ref={canvas}
        width={760}
        height={320}
        style={{ width: "100%", height: 320, touchAction: "none" }}
        aria-label="Ô lattice và điểm nội suy"
        aria-describedby={help}
        onPointerDown={(e) => {
          if (e.button !== 0 || pointer.current !== null) return;
          const p = canvasPoint(e, e.currentTarget);
          if (p.x < left || p.x > left + side || p.y < top || p.y > top + side) return;
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointer.current = e.pointerId;
            updatePoint(e);
          } catch {
            release();
          }
        }}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) updatePoint(e);
        }}
        onPointerUp={(e) => {
          if (pointer.current === e.pointerId) {
            updatePoint(e);
            release();
          }
        }}
        onPointerCancel={(e) => {
          if (pointer.current === e.pointerId) release();
        }}
        onLostPointerCapture={(e) => {
          if (pointer.current === e.pointerId) pointer.current = null;
        }}
      />
      <LabReadout
        items={[
          {
            label: "Bốn góc v00 / v10 / v01 / v11",
            value: [sample.v00, sample.v10, sample.v01, sample.v11]
              .map((v) => v.toFixed(8))
              .join(" / "),
          },
          {
            label: "Điểm trong không gian noise",
            value: `(${sample.x.toFixed(3)}, ${sample.z.toFixed(3)})`,
          },
          {
            label: "Trọng số dùng để trộn X / Z",
            value: `${sample.sx.toFixed(5)} / ${sample.sz.toFixed(5)}`,
          },
          { label: "Hai hàng a / b", value: `${sample.a.toFixed(8)} / ${sample.b.toFixed(8)}` },
          { label: "Kết quả nội suy n", value: sample.n.toFixed(12) },
        ]}
      />
      <p>
        Không có animation tự chạy nên reduced-motion không hạn chế thao tác. Các input HTML thay
        thế hoàn toàn thao tác kéo. Ô bên phải hoặc dưới chia sẻ giá trị tại biên; t=1 ở đây là góc
        của ô đang chọn. Thí nghiệm này không sửa terrain resident và không tải thêm chunk.
      </p>
    </section>
  );
}
