"use client";
import { presetNames } from "@/lib/labs/heat-plate/presets";
import type { BrushMode, Boundary } from "@/lib/labs/heat-plate/model";
import type { HeatSession, Summary } from "@/lib/labs/heat-plate/session";
type Props = {
  session: HeatSession;
  summary: Summary;
  reducedMotion: boolean;
  invoke: (action: () => void) => void;
};

export function HeatControls({ session, summary: s, reducedMotion, invoke }: Props) {
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu
          <select
            value={s.preset}
            onChange={(event) => invoke(() => session.reset(Number(event.target.value)))}
          >
            {presetNames.map((name, index) => {
              if (
                s.stage < 8 &&
                index !== 0 &&
                index !== 5 &&
                !(s.stage >= 6 && index === 2) &&
                !(s.stage >= 5 && index === 4)
              )
                return null;
              return (
                <option key={index} value={index}>
                  {name}
                </option>
              );
            })}
          </select>
        </label>
        {s.stage >= 2 && (
          <>
            <label>
              Bút
              <select
                value={s.brushMode}
                onChange={(event) =>
                  invoke(() => session.setBrush(event.target.value as BrushMode))
                }
              >
                <option value="temperature">Đặt nhiệt độ một lần</option>
                {s.stage >= 5 && (
                  <>
                    <option value="heater">Giữ nhiệt độ (heater)</option>
                    <option value="unpin">Bỏ heater, giữ nhiệt đã có</option>
                  </>
                )}
              </select>
            </label>
            <label>
              Nhiệt độ bút
              <select
                value={s.brushValue}
                onChange={(event) =>
                  invoke(() => session.setBrush(s.brushMode, Number(event.target.value)))
                }
              >
                <option value={1}>Nóng: theta = 1</option>
                <option value={0}>Lạnh: theta = 0</option>
              </select>
            </label>
            <label>
              Bán kính: {s.radius} ô
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={s.radius}
                onChange={(event) => invoke(() => session.setRadius(Number(event.target.value)))}
              />
            </label>
          </>
        )}
        {s.stage >= 5 && (
          <label>
            Điều kiện biên
            <select
              value={s.settings.boundary}
              onChange={(event) =>
                invoke(() => session.setBoundary(event.target.value as Boundary))
              }
            >
              <option value="insulated">Cách nhiệt ở mặt ngoài</option>
              <option value="rim">Giữ cả vành ô ngoài ở 0</option>
            </select>
          </label>
        )}
        {s.stage >= 6 && (
          <>
            <label>
              D = {s.settings.diffusivity.toFixed(2)} (độ dài²/giây mô hình)
              <input
                type="range"
                min={0}
                max={6}
                step={0.05}
                value={s.settings.diffusivity}
                onChange={(event) =>
                  invoke(() => session.setParameter("diffusivity", Number(event.target.value)))
                }
              />
            </label>
            <label>
              dt = {s.settings.dt.toFixed(5)} giây mô hình
              <input
                type="range"
                min={0.002}
                max={0.1}
                step="any"
                value={s.settings.dt}
                onChange={(event) =>
                  invoke(() => session.setParameter("dt", Number(event.target.value)))
                }
              />
            </label>
            <label>
              Tốc độ
              <select
                value={s.speed}
                onChange={(event) => invoke(() => session.setSpeed(Number(event.target.value)))}
              >
                {[0.25, 0.5, 1, 2, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
            <label>
              FPS hiển thị tối đa
              <select
                value={s.fps}
                onChange={(event) => invoke(() => session.setFps(Number(event.target.value)))}
              >
                {[15, 30, 60, 120].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {s.stage >= 7 && (
          <label>
            Độ phân giải (cùng L = 96)
            <select
              value={s.size}
              onChange={(event) =>
                invoke(() => session.reset(s.preset, false, Number(event.target.value)))
              }
            >
              {[128, 192, 256].map((value) => (
                <option key={value} value={value}>
                  {value} × {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="lab-controls">
        {s.stage >= 6 && (
          <button
            type="button"
            disabled={reducedMotion}
            onClick={() => invoke(() => session.toggleRun())}
          >
            {s.paused ? "Chạy" : "Tạm dừng"}
          </button>
        )}
        {s.stage >= 3 && (
          <button type="button" onClick={() => invoke(() => session.singleStep())}>
            Tiến một bước (N)
          </button>
        )}
        <button type="button" onClick={() => invoke(() => session.reset())}>
          Đặt lại
        </button>
        {s.stage >= 2 && (
          <button type="button" onClick={() => invoke(() => session.reset(s.preset, true))}>
            Xóa nhiệt/heater
          </button>
        )}
        {s.stage >= 8 && (
          <button type="button" onClick={() => invoke(() => session.selectProbe(session.cursor))}>
            Đặt probe tại ô chọn (L)
          </button>
        )}
        {s.stage >= 9 && (
          <button type="button" onClick={() => invoke(() => session.validate())}>
            Kiểm fixture riêng
          </button>
        )}
      </div>
      {s.stage >= 6 && (
        <label className="lab-note">
          <input
            type="checkbox"
            checked={s.settings.experiment}
            onChange={() => invoke(() => session.toggleExperiment())}
          />{" "}
          Cho phép thí nghiệm bất ổn — không clamp nghiệm; giới hạn 400 bước và |theta| ≤ 16 ở trạng
          thái được giữ.
        </label>
      )}
      {s.stage >= 7 && (
        <div className="lab-controls">
          <label>
            <input
              type="checkbox"
              checked={s.clean}
              onChange={() =>
                invoke(() => {
                  session.clean = !session.clean;
                })
              }
            />{" "}
            Xem sạch, ẩn con trỏ/probe
          </label>
          {s.stage >= 5 && (
            <label>
              <input
                type="checkbox"
                checked={s.showPins}
                onChange={() =>
                  invoke(() => {
                    session.showPins = !session.showPins;
                  })
                }
              />{" "}
              Đánh dấu ô giữ nhiệt
            </label>
          )}
        </div>
      )}
    </>
  );
}
