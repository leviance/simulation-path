import type { WaterSession, Snapshot, Preset, Tool, View } from "@/lib/labs/sph-water";
type Props = {
  session: WaterSession;
  snapshot: Snapshot;
  reducedMotion: boolean;
  change: (action: () => void) => void;
};
export function WaterControls({ session, snapshot: s, reducedMotion, change }: Props) {
  const parameter = (action: () => void) =>
    change(() => {
      session.pause();
      action();
    });
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu{" "}
          <select
            aria-label="Cảnh mẫu"
            value={s.preset}
            onChange={(e) => change(() => session.chooseScene(e.target.value as Preset))}
          >
            <option value="dam">Vỡ đập</option>
            <option value="pool">Hồ nước</option>
            {session.stage >= 11 && <option value="obstacle">Dòng chảy gặp vật cản</option>}
            <option value="empty">Bể trống</option>
          </select>
        </label>
        <button
          type="button"
          disabled={session.stage < 8 || reducedMotion}
          onClick={() =>
            change(() => {
              if (session.paused) session.resume();
              else session.pause();
            })
          }
        >
          {s.paused ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={session.stage < 2}
          onClick={() => change(() => session.singleStep())}
        >
          Tiến một bước
        </button>
        <button type="button" onClick={() => change(() => session.reset())}>
          Đặt lại
        </button>
        {session.stage >= 9 && (
          <>
            <label>
              Số hạt{" "}
              <select
                aria-label="Số hạt"
                value={s.requested}
                onChange={(e) => change(() => session.chooseCount(Number(e.target.value)))}
              >
                <option value={1000}>1.000 — học</option>
                <option value={5000}>5.000 — bản chuẩn</option>
                <option value={10000}>10.000 — mở rộng</option>
              </select>
            </label>
            <label>
              Lớp hiển thị{" "}
              <select
                aria-label="Lớp hiển thị"
                value={s.view}
                onChange={(e) =>
                  change(() => {
                    session.view = e.target.value as View;
                  })
                }
              >
                <option value="surface">Mặt nước</option>
                <option value="particles">Hạt thật</option>
                <option value="density">Density</option>
                <option value="pressure">Pressure</option>
                <option value="speed">Tốc độ</option>
              </select>
            </label>
          </>
        )}
        <label>
          <input
            type="checkbox"
            checked={s.debug}
            onChange={(e) =>
              change(() => {
                session.debug = e.target.checked;
              })
            }
          />
          Hiện số đo
        </label>
      </div>
      <details>
        <summary>Tham số và công cụ thí nghiệm</summary>
        <div className="lab-controls">
          {session.stage >= 5 && (
            <label>
              Tốc độ âm c: {s.settings.soundSpeed.toFixed(1)} m/s
              <input
                aria-label="Tốc độ âm c"
                type="range"
                min={12}
                max={40}
                step={1}
                value={s.settings.soundSpeed}
                onChange={(e) =>
                  parameter(() => session.parameter({ soundSpeed: Number(e.target.value) }))
                }
              />
            </label>
          )}
          {session.stage >= 6 && (
            <label>
              Artificial viscosity α: {s.settings.alpha.toFixed(2)}
              <input
                aria-label="Artificial viscosity alpha"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.settings.alpha}
                onChange={(e) =>
                  parameter(() => session.parameter({ alpha: Number(e.target.value) }))
                }
              />
            </label>
          )}
          {session.stage >= 2 && (
            <label>
              Trọng lực: {s.settings.gravity.toFixed(2)} m/s²
              <input
                aria-label="Trọng lực"
                type="range"
                min={0}
                max={12}
                step={0.1}
                value={s.settings.gravity}
                onChange={(e) =>
                  parameter(() => session.parameter({ gravity: Number(e.target.value) }))
                }
              />
            </label>
          )}
          {session.stage >= 7 && (
            <label>
              Tìm hàng xóm{" "}
              <select
                aria-label="Tìm hàng xóm"
                value={s.settings.useGrid ? "grid" : "all"}
                onChange={(e) =>
                  parameter(() => session.parameter({ useGrid: e.target.value === "grid" }))
                }
              >
                <option value="grid">Uniform grid</option>
                <option value="all" disabled={s.count > 1000}>
                  All-pairs — tối đa 1.000 hạt
                </option>
              </select>
            </label>
          )}
          {session.stage >= 10 && (
            <>
              <label>
                Công cụ chuột{" "}
                <select
                  aria-label="Công cụ chuột"
                  value={s.tool}
                  onChange={(e) =>
                    change(() => {
                      session.tool = e.target.value as Tool;
                    })
                  }
                >
                  <option value="pour">Vòi nước</option>
                  {session.stage >= 11 && <option value="paddle">Kéo vật cản</option>}
                  <option value="inspect">Chọn hạt</option>
                </select>
              </label>
              <button type="button" onClick={() => change(() => session.emit())}>
                Đổ một đợt
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={s.pouring}
                  onChange={(e) =>
                    change(() => {
                      session.pouring = e.target.checked;
                    })
                  }
                />
                Đổ liên tục khi chạy
              </label>
            </>
          )}
          {session.stage >= 11 && (
            <label>
              <input
                type="checkbox"
                checked={s.paddle}
                onChange={(e) =>
                  parameter(() => {
                    session.state.paddle.enabled = e.target.checked;
                    session.inspect();
                  })
                }
              />
              Bật vật cản
            </label>
          )}
          {session.stage >= 12 && (
            <button
              type="button"
              onClick={() =>
                change(() => {
                  session.verify();
                })
              }
            >
              Kiểm chứng ca chuẩn
            </button>
          )}
        </div>
      </details>
    </>
  );
}
