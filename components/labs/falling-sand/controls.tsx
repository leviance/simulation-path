"use client";

import { useId, useState } from "react";
import { Cell, orderNames } from "@/lib/labs/falling-sand/model";
import { presetNames } from "@/lib/labs/falling-sand/presets";
import { speeds } from "@/lib/labs/falling-sand/timing";
import type { SandSession, Summary } from "@/lib/labs/falling-sand/session";

type Props = {
  session: SandSession;
  summary: Summary;
  reducedMotion: boolean;
  invoke: (action: () => void) => void;
};

export function SandControls({ session, summary, reducedMotion, invoke }: Props) {
  const [seedText, setSeedText] = useState(String(summary.seed));
  const [seedError, setSeedError] = useState("");
  const errorId = useId();
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu
          <select
            value={summary.preset}
            onChange={(event) => invoke(() => session.reset(Number(event.target.value)))}
          >
            <option value={0}>{summary.stage < 7 ? "Cát trên bệ" : presetNames[0]}</option>
            {summary.stage >= 8 && (
              <>
                <option value={1}>{presetNames[1]}</option>
                <option value={2}>{presetNames[2]}</option>
                <option value={3}>{presetNames[3]}</option>
              </>
            )}
            <option value={4}>{presetNames[4]}</option>
          </select>
        </label>
        {summary.stage >= 2 && (
          <>
            <label>
              Vật liệu
              <select
                value={summary.material}
                onChange={(event) => invoke(() => session.setMaterial(Number(event.target.value)))}
              >
                <option value={Cell.Sand}>Cát</option>
                <option value={Cell.Wall}>Tường</option>
                {summary.stage >= 5 && <option value={Cell.Water}>Nước giả</option>}
                <option value={Cell.Empty}>Tẩy</option>
              </select>
            </label>
            <label>
              Bán kính bút: {summary.radius} ô
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={summary.radius}
                onChange={(event) => invoke(() => session.setRadius(Number(event.target.value)))}
              />
            </label>
          </>
        )}
        {summary.stage >= 6 && (
          <>
            <label>
              Tốc độ mô phỏng
              <select
                value={summary.speed}
                onChange={(event) => invoke(() => session.setSpeed(Number(event.target.value)))}
              >
                {speeds.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}×
                  </option>
                ))}
              </select>
            </label>
            <label>
              FPS hiển thị tối đa
              <select
                value={summary.fps}
                onChange={(event) => invoke(() => session.setFps(Number(event.target.value)))}
              >
                {[15, 30, 60, 120].map((fps) => (
                  <option key={fps} value={fps}>
                    {fps}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          type="button"
          disabled={summary.stage < 6 || reducedMotion}
          onClick={() => invoke(() => session.toggleRun())}
        >
          {summary.paused ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={summary.stage < 3}
          onClick={() => invoke(() => session.singleStep())}
        >
          Tiến một tick
        </button>
        <button type="button" onClick={() => invoke(() => session.reset())}>
          Đặt lại
        </button>
        <button
          type="button"
          disabled={summary.stage < 2}
          onClick={() => invoke(() => session.reset(session.preset, session.seed, true))}
        >
          Xóa lưới
        </button>
      </div>
      <div className="lab-controls">
        {summary.stage >= 3 && (
          <label>
            <input
              type="checkbox"
              checked={summary.showMoved}
              onChange={(event) => invoke(() => session.setMovedOverlay(event.target.checked))}
            />
            Xem cờ moved
          </label>
        )}
        {summary.stage >= 7 && (
          <label>
            <input
              type="checkbox"
              checked={summary.plain}
              onChange={(event) => invoke(() => session.setPlain(event.target.checked))}
            />
            Màu phẳng
          </label>
        )}
        {summary.stage >= 7 && (
          <label>
            <input
              type="checkbox"
              checked={summary.clean}
              onChange={(event) => invoke(() => session.setClean(event.target.checked))}
            />
            Chế độ xem sạch
          </label>
        )}
        {summary.stage >= 8 && (
          <>
            <label>
              Thứ tự quét
              <select
                value={summary.order}
                onChange={(event) => invoke(() => session.setOrder(Number(event.target.value)))}
              >
                {orderNames.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="lab-controls"
              onSubmit={(event) => {
                event.preventDefault();
                if (!/^\d{1,10}$/.test(seedText) || Number(seedText) > 0xffffffff) {
                  setSeedError("Nhập số nguyên từ 0 đến 4294967295; cảnh hiện tại chưa thay đổi.");
                  return;
                }
                setSeedError("");
                invoke(() => session.reset(session.preset, Number(seedText)));
              }}
            >
              <label>
                Seed cảnh
                <input
                  type="text"
                  inputMode="numeric"
                  value={seedText}
                  onChange={(event) => setSeedText(event.target.value)}
                  aria-invalid={Boolean(seedError)}
                  aria-describedby={errorId}
                />
              </label>
              <button type="submit">Áp dụng seed</button>
            </form>
          </>
        )}
        {summary.stage >= 9 && (
          <button type="button" onClick={() => invoke(() => session.validate())}>
            Kiểm các ca nhỏ
          </button>
        )}
      </div>
      <p id={errorId} className="lab-note" role="status">
        {seedError}
      </p>
    </>
  );
}
