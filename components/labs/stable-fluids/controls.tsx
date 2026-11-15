import {
  amber,
  cyan,
  white,
  type FluidSession,
  type Snapshot,
  type Layer,
  type Scene,
  type Tool,
  type Method,
} from "@/lib/labs/stable-fluids";
type Props = {
  session: FluidSession;
  snapshot: Snapshot;
  reducedMotion: boolean;
  change: (action: () => void) => void;
};
export function FluidControls({ session, snapshot: s, reducedMotion, change }: Props) {
  const stage = session.stage;
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
            value={s.scene}
            disabled={stage < 2}
            onChange={(e) => change(() => session.chooseScene(e.target.value as Scene))}
          >
            <option value="jets">Hai luồng khói</option>
            <option value="empty">Hộp trống</option>
            {stage >= 4 && (
              <>
                <option value="vortex">Dòng xoáy</option>
                <option value="compression">Nén và giãn</option>
              </>
            )}
            {stage >= 5 && <option value="jacobi">Ca Jacobi 8×8</option>}
          </select>
        </label>
        <button
          type="button"
          disabled={stage < 10 || reducedMotion}
          onClick={() => change(() => session.toggle())}
        >
          {s.paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={stage < 3}
          onClick={() => parameter(() => session.singleStep())}
        >
          Tiến một bước
        </button>
        <button type="button" onClick={() => change(() => session.reset())}>
          Đặt lại
        </button>
        {stage >= 2 && (
          <label>
            Công cụ{" "}
            <select
              aria-label="Công cụ"
              value={s.tool}
              onChange={(e) =>
                change(() => {
                  session.tool = e.target.value as Tool;
                })
              }
            >
              {stage >= 8 && <option value="stir">Khuấy / click thêm khói</option>}
              <option value="paint">Vẽ khói</option>
              <option value="erase">Xóa khói</option>
              <option value="probe">Chỉ đọc số</option>
            </select>
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={!s.clean}
            onChange={(e) =>
              change(() => {
                session.clean = !e.target.checked;
              })
            }
          />{" "}
          Hiện số đo
        </label>
      </div>
      <details>
        <summary>Tham số và công cụ thí nghiệm</summary>
        <div className="lab-controls">
          {stage >= 2 && (
            <label>
              Bán kính: {s.radius} ô{" "}
              <input
                aria-label="Bán kính bút"
                type="range"
                min={1}
                max={16}
                step={1}
                value={s.radius}
                onChange={(e) =>
                  change(() => {
                    session.radius = Number(e.target.value);
                  })
                }
              />
            </label>
          )}
          {stage >= 4 && (
            <>
              <label>
                Lớp hiển thị{" "}
                <select
                  aria-label="Lớp hiển thị"
                  value={s.layer}
                  onChange={(e) =>
                    change(() => {
                      session.layer = e.target.value as Layer;
                    })
                  }
                >
                  <option value="smoke">Khói</option>
                  <option value="velocity">Velocity</option>
                  {stage >= 5 && <option value="pressure">Pressure</option>}
                  <option value="divergence">Divergence</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={s.vectors}
                  onChange={(e) =>
                    change(() => {
                      session.vectors = e.target.checked;
                    })
                  }
                />{" "}
                Mũi tên vận tốc
              </label>
            </>
          )}
          {stage >= 8 && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={s.colored}
                  onChange={(e) =>
                    change(() => {
                      session.colored = e.target.checked;
                    })
                  }
                />{" "}
                Màu tracer
              </label>
              <label>
                Màu bút{" "}
                <select
                  aria-label="Màu bút"
                  defaultValue="cyan"
                  onChange={(e) =>
                    change(() => {
                      session.ink =
                        e.target.value === "cyan"
                          ? cyan
                          : e.target.value === "amber"
                            ? amber
                            : white;
                      session.colored = true;
                    })
                  }
                >
                  <option value="cyan">Xanh</option>
                  <option value="amber">Cam</option>
                  <option value="white">Trắng</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={s.parameters.emit}
                  onChange={(e) =>
                    parameter(() => {
                      session.parameters.emit = e.target.checked;
                    })
                  }
                />{" "}
                Nguồn khói liên tục
              </label>
              <label>
                Lực nổi{" "}
                <select
                  aria-label="Lực nổi"
                  value={s.parameters.buoyancy}
                  onChange={(e) =>
                    parameter(() => {
                      session.parameters.buoyancy = Number(e.target.value);
                    })
                  }
                >
                  <option value={0}>0</option>
                  <option value={0.8}>0,8</option>
                  <option value={1.6}>1,6</option>
                </select>
              </label>
              {(
                [
                  [-0.05, 0, "trái"],
                  [0.05, 0, "phải"],
                  [0, 0.05, "lên"],
                  [0, -0.05, "xuống"],
                ] as const
              ).map(([x, y, name]) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => change(() => session.impulse({ x, y }))}
                >
                  Khuấy {name}
                </button>
              ))}
            </>
          )}
          {stage >= 9 && (
            <label>
              Độ nhớt ν{" "}
              <select
                aria-label="Độ nhớt ν"
                value={s.parameters.viscosity}
                onChange={(e) =>
                  parameter(() => {
                    session.parameters.viscosity = Number(e.target.value);
                  })
                }
              >
                {[0, 0.0001, 0.0005, 0.003].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
          {stage >= 10 && (
            <label>
              Độ phân giải{" "}
              <select
                aria-label="Độ phân giải"
                value={s.n}
                disabled={s.scene === "jacobi"}
                onChange={(e) => change(() => session.rebuild(Number(e.target.value)))}
              >
                {s.n === 8 && <option value={8}>8×8 · ca Jacobi</option>}
                {(stage >= 14
                  ? [16, 32, 64, 128, 256]
                  : stage >= 11
                    ? [16, 32, 64, 128]
                    : [16, 32]
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}
                    {n === 128
                      ? " · mặc định"
                      : n === 256
                        ? " · chi tiết cao, chậm hơn"
                        : " · học/debug"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {stage >= 11 && (
            <label>
              Bộ giải pressure{" "}
              <select
                aria-label="Bộ giải pressure"
                value={s.parameters.method}
                onChange={(e) =>
                  parameter(() => {
                    session.parameters.method = e.target.value as Method;
                    session.parameters.pressureBudget = e.target.value === "jacobi" ? 160 : 384;
                  })
                }
              >
                <option value="jacobi">Weighted Jacobi</option>
                <option value="cg">CG</option>
                {stage >= 14 && <option value="pcg">PCG + multigrid</option>}
              </select>
            </label>
          )}
          {stage >= 5 && (
            <label>
              Ngân sách pressure{" "}
              <select
                aria-label="Ngân sách pressure"
                value={s.parameters.pressureBudget}
                onChange={(e) =>
                  parameter(() => {
                    session.parameters.pressureBudget = Number(e.target.value);
                  })
                }
              >
                {(s.parameters.method === "jacobi" ? [40, 80, 160] : [128, 256, 384]).map((n) => (
                  <option key={n} value={n}>
                    {n} vòng
                  </option>
                ))}
              </select>
            </label>
          )}
          {stage >= 12 && (
            <label>
              <input
                type="checkbox"
                checked={s.parameters.highOrder}
                onChange={(e) =>
                  parameter(() => {
                    session.parameters.highOrder = e.target.checked;
                  })
                }
              />{" "}
              MacCormack có limiter
            </label>
          )}
          {stage >= 13 && (
            <label>
              Vorticity confinement ε{" "}
              <select
                aria-label="Vorticity confinement ε"
                value={s.parameters.confinement}
                onChange={(e) =>
                  parameter(() => {
                    session.parameters.confinement = Number(e.target.value);
                  })
                }
              >
                {[0, 4, 8, 12, 16, 20].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}
          {stage >= 5 && (
            <>
              <button
                type="button"
                disabled={s.pressureReady && s.iterations >= 160}
                onClick={() => change(() => session.jacobi())}
              >
                Tiến một vòng Jacobi
              </button>
              <button type="button" onClick={() => change(() => session.jacobi(true))}>
                Bắt đầu lại pressure
              </button>
            </>
          )}
          {stage >= 15 && (
            <button type="button" onClick={() => change(() => session.verify())}>
              Kiểm chứng ca chuẩn
            </button>
          )}
        </div>
      </details>
    </>
  );
}
