"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  add,
  auditForces,
  cachedVerletStep,
  emptyList,
  ensureList,
  evaluateListed,
  makeApproach,
  makeGas,
  maximumDisplacement,
  measureWork,
  needsRebuild,
  rebuildNaive,
  validateNeighborList,
  wrapPosition,
  type Vec2,
} from "@/lib/labs/neighbor-list-skin";
import { fixedStepPlan } from "@/lib/labs/periodic-molecular-box";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import { drawNeighbors, makeViewport, toScreen } from "./neighbor-list-skin-render";

const modes = [
  "nl-cutoff",
  "nl-build",
  "nl-forces",
  "nl-rebuild",
  "nl-grid",
  "nl-verlet",
  "nl-audit",
  "nl-work",
  "nl-final",
];
function initialModel(stage: number, preset: string = "64", skin = 0.4) {
  const system = preset === "pair" ? makeApproach() : makeGas(Number(preset), 44);
  const list = emptyList();
  if (stage >= 2) ensureList(system, skin, 0, list, stage >= 5);
  return { system, list, generation: 0 };
}

function NeighborLab({ mode }: { mode: string }) {
  const stage = Math.max(1, modes.indexOf(mode) + 1);
  const [initial] = useState(() => initialModel(stage, stage === 7 ? "pair" : "64"));
  const model = useRef(initial);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initial));
  const [preset, setPreset] = useState(stage === 7 ? "pair" : "64");
  const [skin, setSkin] = useState(0.4);
  const [paused, setPaused] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [grid, setGrid] = useState(true);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<ReturnType<typeof auditForces> | null>(null);
  const [work, setWork] = useState<Array<{ skin: number; report: ReturnType<typeof measureWork> }>>(
    [],
  );
  const [validation, setValidation] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [dropped, setDropped] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accumulator = useRef(0);
  const drag = useRef<{ id: number; point: Vec2 } | null>(null);
  const job = useRef(0);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const { system, list } = snapshot;
  const publish = useCallback(() => setSnapshot(structuredClone(model.current)), []);
  const force = useMemo(
    () => (stage >= 3 ? evaluateListed(system, list) : null),
    [system, list, stage],
  );
  const stale = stage >= 4 && needsRebuild(system, skin, snapshot.generation, list);

  const stop = useCallback(() => {
    setPaused(true);
    accumulator.current = 0;
  }, []);
  const reset = useCallback(
    (nextPreset = "64", nextSkin = 0.4) => {
      job.current += 1;
      setBusy(false);
      stop();
      model.current = initialModel(stage, nextPreset, nextSkin);
      setPreset(nextPreset);
      setSkin(nextSkin);
      setFrozen(false);
      setGrid(true);
      setError("");
      setAudit(null);
      setWork([]);
      setValidation(null);
      setDropped(0);
      publish();
    },
    [publish, stage, stop],
  );
  const refresh = useCallback(
    (nextSkin: number) => {
      stop();
      setSkin(nextSkin);
      setFrozen(false);
      setAudit(null);
      setError("");
      const current = model.current;
      current.list.ready = false;
      if (!ensureList(current.system, nextSkin, current.generation, current.list, stage >= 5))
        setError("Không thể dựng danh sách với trạng thái hiện tại.");
      publish();
    },
    [publish, stage, stop],
  );
  const move = useCallback(
    (delta: Vec2) => {
      stop();
      setAudit(null);
      setValidation(null);
      setError("");
      const current = model.current;
      const particle = current.system.particles[0];
      particle.position = wrapPosition(add(particle.position, delta), current.system.box);
      particle.unwrapped = add(particle.unwrapped, delta);
      particle.velocity = { x: 0, y: 0 };
      if (stage >= 2 && stage < 4)
        rebuildNaive(current.system, skin, current.generation, current.list);
      if (
        stage >= 4 &&
        !frozen &&
        !ensureList(current.system, skin, current.generation, current.list, stage >= 5)
      )
        setError("Danh sách không hợp lệ. Hãy đặt lại mô phỏng.");
      publish();
    },
    [frozen, publish, skin, stage, stop],
  );
  const advance = useCallback(
    (steps: number) => {
      if (stage < 6 || frozen || busy) return;
      const current = model.current;
      setAudit(null);
      setValidation(null);
      for (let step = 0; step < steps; step += 1) {
        if (!cachedVerletStep(current.system, current.list, skin, current.generation, 0.002)) {
          stop();
          setError(
            "Bước bị từ chối: hạt quá gần nhau hoặc có giá trị không hợp lệ. Hệ hạt và danh sách vẫn giữ nguyên. Hãy tách hạt hoặc đặt lại.",
          );
          break;
        }
      }
      publish();
    },
    [busy, frozen, publish, skin, stage, stop],
  );
  useEffect(
    () => () => {
      job.current += 1;
    },
    [],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [stop]);
  useEffect(() => {
    if (paused || frozen || busy || stage < 6 || reducedMotion) return;
    let handle = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.max(0, (now - previous) / 1000);
      previous = now;
      const maximum = model.current.system.particles.length >= 1000 ? 1 : 8;
      const plan = fixedStepPlan(accumulator.current, elapsed, 0.002, maximum);
      accumulator.current = plan.remainder;
      if (plan.droppedTime > 0) setDropped((value) => value + plan.droppedTime);
      if (plan.steps > 0) advance(plan.steps);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [advance, busy, frozen, paused, reducedMotion, stage]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    setupCanvas(context, size);
    drawNeighbors(context, size, system, list, skin, stage, grid, stale);
  }, [grid, list, size, skin, stage, stale, system]);

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || busy) return;
    const point = canvasPoint(event, event.currentTarget);
    const selected = toScreen(
      system.particles[0].position,
      system,
      makeViewport(size.width, size.height),
    );
    if (Math.hypot(point.x - selected.x, point.y - selected.y) > 24) return;
    stop();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, point };
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const point = canvasPoint(event, event.currentTarget);
    const previous = drag.current.point;
    drag.current.point = point;
    const viewport = makeViewport(size.width, size.height);
    move({
      x: ((point.x - previous.x) / viewport.side) * system.box.width,
      y: ((point.y - previous.y) / viewport.side) * system.box.height,
    });
  }
  function release(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const offsets: Record<string, Vec2> = {
      ArrowLeft: { x: -0.05, y: 0 },
      ArrowRight: { x: 0.05, y: 0 },
      ArrowUp: { x: 0, y: -0.05 },
      ArrowDown: { x: 0, y: 0.05 },
    };
    if (offsets[event.key]) {
      event.preventDefault();
      if (!busy) move(offsets[event.key]);
    }
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "n" && stage >= 6) {
      stop();
      advance(1);
    }
    if (event.key === " " && stage >= 6) {
      event.preventDefault();
      if (!frozen && !busy && !reducedMotion) setPaused((value) => !value);
    }
  }
  async function compareWork() {
    stop();
    setBusy(true);
    setWork([]);
    const token = ++job.current;
    for (const testedSkin of [0.2, 0.4, 0.8, 1.2]) {
      // Nhường một lượt cho trình duyệt giữa các phép đo hữu hạn.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (job.current !== token) return;
      const report = measureWork(64, testedSkin);
      setWork((rows) => [...rows, { skin: testedSkin, report }]);
    }
    setBusy(false);
  }
  const items = [
    {
      label: "Hạt thật / mọi cặp mỗi lần tính lực",
      value: `${system.particles.length} / ${(system.particles.length * (system.particles.length - 1)) / 2}`,
    },
    {
      label: "Vị trí A",
      value: `${system.particles[0].position.x.toFixed(2)}, ${system.particles[0].position.y.toFixed(2)}`,
    },
  ];
  if (stage >= 2)
    items.push({
      label: "Cặp trong danh sách / lần dựng",
      value: `${list.pairs.length} / ${list.rebuilds}`,
    });
  if (force)
    items.push({
      label: "Cặp đang có lực / rlist",
      value: `${force.activePairs} / ${(system.parameters.cutoff + skin).toFixed(2)}`,
    });
  if (stage >= 4)
    items.push({
      label: "Dmax / skin÷2",
      value: `${maximumDisplacement(system, list).toFixed(4)} / ${(skin / 2).toFixed(2)}`,
    });
  if (stage >= 6)
    items.push({
      label: "Thời gian mô phỏng / thời gian bỏ qua",
      value: `${system.elapsed.toFixed(3)} / ${dropped.toFixed(3)}`,
    });
  return (
    <div className="lab-body">
      <div className="lab-toolbar">
        <label>
          Preset{" "}
          <select
            value={preset}
            disabled={busy}
            onChange={(event) => reset(event.target.value, skin)}
          >
            <option value="64">64 hạt</option>
            <option value="144">144 hạt</option>
            <option value="1000">1.000 hạt (tối đa 1 bước/frame)</option>
            <option value="pair">Hai hạt tiến lại gần</option>
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Skin{" "}
              <select
                value={skin}
                disabled={busy}
                onChange={(event) => refresh(Number(event.target.value))}
              >
                {[0.2, 0.4, 0.8, 1.2].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={() => refresh(skin)}>
              Dựng lại danh sách
            </button>
          </>
        )}
        {stage >= 5 && (
          <label>
            <input
              type="checkbox"
              checked={grid}
              onChange={(event) => setGrid(event.target.checked)}
            />{" "}
            Hiện cell grid
          </label>
        )}
        {stage >= 6 && (
          <>
            <button
              type="button"
              disabled={frozen || busy || reducedMotion}
              onClick={() => setPaused((value) => !value)}
            >
              {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
            </button>
            <button
              type="button"
              disabled={frozen || busy}
              onClick={() => {
                stop();
                advance(1);
              }}
            >
              Tiến 1 bước
            </button>
          </>
        )}
        <button type="button" onClick={() => reset()}>
          Đặt lại (R)
        </button>
      </div>
      {stage >= 7 && (
        <div className="lab-toolbar">
          <label>
            <input
              type="checkbox"
              disabled={busy}
              checked={frozen}
              onChange={(event) => {
                stop();
                setAudit(null);
                if (!event.target.checked) refresh(skin);
                else setFrozen(true);
              }}
            />{" "}
            Cố ý giữ danh sách cũ (chỉ kéo tay)
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              stop();
              setAudit(auditForces(model.current.system, model.current.list));
            }}
          >
            Đối chiếu mọi cặp
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: 420, touchAction: "none" }}
        tabIndex={0}
        aria-label="Mô phỏng neighbor list: kéo hạt A màu vàng hoặc dùng phím mũi tên để dịch 0.05 đơn vị"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={keyDown}
        onBlur={stop}
      >
        Vòng xanh có bán kính cutoff=2.5. Vòng vàng có bán kính cutoff+skin. Đoạn nối đánh dấu cặp
        đã lưu, không tự chứng minh danh sách còn đủ.
      </canvas>
      <LabReadout items={items} />
      <p>
        Hạt A màu vàng. Kéo A hoặc chọn Canvas rồi dùng phím mũi tên (0.05 mỗi lần). Việc sửa tay
        dừng mô phỏng và đưa vận tốc A về 0; đây không phải một bước vật lý. Vòng xanh là
        cutoff=2.5; vòng vàng nét đứt là cutoff+skin.
      </p>
      {stage >= 2 && (
        <p>
          Đường nối chỉ hiển thị các cặp có A trong danh sách đã lưu. Vòng tròn đi theo A hiện tại,
          còn danh sách được tạo tại mốc unwrapped đã lưu. Khi thay skin hoặc preset, danh sách được
          dựng lại ngay.
        </p>
      )}
      {stage >= 3 && (
        <p>
          Xanh: cặp trong cutoff. Xám: cặp trong danh sách nhưng chưa có lực. Tổng số cặp trên bảng
          tính cho cả hệ, không chỉ các đường nối với A.
        </p>
      )}
      {stage >= 4 && (
        <p role="status">
          {stale
            ? "Danh sách đã quá hạn: Dmax chạm nửa skin. Các đoạn nối đỏ là dữ liệu cũ; hãy đối chiếu hoặc dựng lại."
            : "Danh sách còn hiệu lực tại lần tính lực này."}
        </p>
      )}
      {stage >= 6 && (
        <p>
          dt=0.002, playback=0.1. Mỗi frame tối đa 8 bước, hoặc 1 bước với 1.000 hạt. N: tiến một
          bước; Space: chạy/dừng.{" "}
          {reducedMotion && "Thiết bị đang yêu cầu giảm chuyển động: chỉ dùng tiến từng bước."}
        </p>
      )}
      {frozen && (
        <p>
          Đang giữ danh sách cũ. Chạy và tiến bước bị khóa; chỉ dùng kéo tay để tạo lỗi rồi bấm “Đối
          chiếu mọi cặp”.
        </p>
      )}
      {(error || (force && !force.valid)) && (
        <p role="alert">
          {error ||
            "Không tính được lực: hạt đang trùng hoặc quá gần nhau. Tách chúng ra hoặc đặt lại."}
        </p>
      )}
      {audit && (
        <p role="status">
          {audit.passed ? "Đạt" : "Không đạt"}: bỏ sót {audit.missingPairs} cặp; sai số lực{" "}
          {audit.forceError.toExponential(3)}, sai số U {audit.potentialError.toExponential(3)}. Đây
          là đối chiếu trên trạng thái hiện tại, không phải cam kết cho mọi bước sau đó.
        </p>
      )}
      {stage >= 8 && (
        <>
          <button type="button" disabled={busy} onClick={() => void compareWork()}>
            {busy ? "Đang so sánh…" : "So sánh 4 giá trị skin"}
          </button>
          <p>
            Ca riêng: 64 hạt, seed=44, 200 bước, dt=0.002. Đếm build checks và force checks; không
            đo thời gian chạy. Việc vẽ, kiểm chứng và sao chép state không nằm trong hai bộ đếm này.
          </p>
          {work.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table>
                <caption>Số lượt kiểm tra cặp trong cùng 200 bước</caption>
                <thead>
                  <tr>
                    <th>Skin</th>
                    <th>Dựng lại</th>
                    <th>Build</th>
                    <th>Force</th>
                    <th>Tổng</th>
                    <th>Mọi cặp</th>
                    <th>Kiểm lực cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {work.map((row) => (
                    <tr key={row.skin}>
                      <td>{row.skin}</td>
                      <td>{row.report.rebuilds}</td>
                      <td>{row.report.buildChecks}</td>
                      <td>{row.report.forceChecks}</td>
                      <td>{row.report.buildChecks + row.report.forceChecks}</td>
                      <td>{row.report.allPairsChecks}</td>
                      <td>{row.report.passed ? "Đạt" : "Không đạt"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {stage >= 9 && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              stop();
              setValidation(validateNeighborList());
            }}
          >
            Kiểm chứng 36 hạt × 200 bước
          </button>
          {validation !== null && (
            <p role="status">
              {validation ? "Đạt" : "Không đạt"}: lực và quỹ đạo so với mọi cặp, sai số năng lượng
              chuẩn hóa dưới 1%, sai số động lượng dưới 1e-9. CTest còn có các ca biên và rollback
              riêng.
            </p>
          )}
        </>
      )}
    </div>
  );
}
export default function NeighborListSkinLab({ mode = "nl-final" }: { mode?: string }) {
  return <NeighborLab key={mode} mode={mode} />;
}
