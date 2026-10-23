import {
  analyticIntegratorState,
  integratorAngularFrequency,
  integratorEnergy,
  INTEGRATOR_NAMES,
  measureIntegratorState,
  traceExplicitEulerStep,
  traceVelocityVerletStep,
  traceRungeKutta4Step,
} from "@/lib/labs/integrator-race";
import { integratorFixedDelta, type IntegratorScene } from "@/lib/labs/integrator-scene";
import { LabReadout } from "./lab-shared";

export function integratorNumber(value: number, unit = "") {
  return Number.isFinite(value) ? value.toExponential(4) + unit : "không xác định";
}
export function IntegratorReadout({
  scene,
  capturing,
}: {
  scene: IntegratorScene;
  capturing: boolean;
}) {
  const exact = analyticIntegratorState(scene.initial, scene.parameters, scene.elapsed);
  const items = [
    {
      label: "Hệ oscillator",
      value: `m=${scene.parameters.mass.toFixed(2)} kg · k=${scene.parameters.stiffness.toFixed(2)} N/m · ω=${integratorAngularFrequency(scene.parameters).toFixed(3)} rad/s`,
    },
    { label: "Elapsed / step", value: `${scene.elapsed.toFixed(3)} s / ${scene.race.stepCount}` },
    {
      label: "Exact state",
      value: `x=${exact.position.toFixed(5)} m · v=${exact.velocity.toFixed(5)} m/s · E=${integratorNumber(integratorEnergy(exact, scene.parameters), " J")}`,
    },
    {
      label: "Force evaluations",
      value: scene.race.lanes.map((lane) => lane.forceEvaluations).join(" / "),
    },
    {
      label: "Frame guard / pointer capture",
      value: `${scene.substeps} substep · ${scene.droppedTime.toFixed(3)} s dropped · ${capturing ? "đang kéo" : "đã nhả"}`,
    },
  ];
  scene.race.lanes.forEach((lane, index) => {
    if (index >= Math.min(3, scene.stage - 1)) return;
    let value = `x=${lane.state.position.toFixed(5)} m · v=${lane.state.velocity.toFixed(5)} m/s · ${lane.forceEvaluations} lần tính lực`;
    if (scene.stage >= 6) {
      const metrics = measureIntegratorState(lane.state, scene.initial, scene.parameters);
      value += ` · state error=${integratorNumber(metrics.phaseSpaceError, " m")} · ΔE/E₀=${integratorNumber(metrics.relativeEnergyDrift)}`;
    }
    items.push({ label: `Làn ${index + 1} · ${INTEGRATOR_NAMES[lane.kind]}`, value });
  });
  if (scene.stage >= 2 && scene.stage <= 4) {
    const previous = scene.beforeLast ?? scene.race;
    const current = previous.lanes[scene.stage - 2].state,
      dt = integratorFixedDelta(scene);
    items.push({
      label: "Bước đang phân tích",
      value: scene.beforeLast
        ? `Bước vừa tính từ t=${current.elapsed.toFixed(3)} s`
        : `Chưa tiến: dự đoán từ t=${current.elapsed.toFixed(3)} s`,
    });
    if (scene.stage === 2) {
      const trace = traceExplicitEulerStep(current, scene.parameters, dt);
      if (trace)
        items.push({
          label: "Euler · a₀ → (x₁, v₁)",
          value: `${trace.accelerationStart.toFixed(5)} → (${trace.next.position.toFixed(5)}, ${trace.next.velocity.toFixed(5)})`,
        });
    }
    if (scene.stage === 3) {
      const trace = traceVelocityVerletStep(current, scene.parameters, dt);
      if (trace)
        items.push({
          label: "Verlet · a₀ → x₁ → a₁ → v₁",
          value: [
            trace.accelerationStart,
            trace.positionEnd,
            trace.accelerationEnd,
            trace.next.velocity,
          ]
            .map((value) => value.toFixed(5))
            .join(" → "),
        });
    }
    if (scene.stage === 4) {
      const trace = traceRungeKutta4Step(current, scene.parameters, dt);
      if (trace)
        for (const [key, derivative] of [
          ["k₁", trace.k1],
          ["k₂", trace.k2],
          ["k₃", trace.k3],
          ["k₄", trace.k4],
        ] as const)
          items.push({
            label: `RK4 · ${key}`,
            value: `dx/dt=${derivative.positionRate.toFixed(5)} m/s · dv/dt=${derivative.velocityRate.toFixed(5)} m/s²`,
          });
    }
  }
  if (scene.stage >= 6)
    items.push({
      label: "History / fast job",
      value: `${scene.history.length} mẫu · còn ${scene.fastRemaining} bước tua nhanh`,
    });
  return <LabReadout items={items} />;
}

export function IntegratorBenchmarkPanel({ scene }: { scene: IntegratorScene }) {
  const job = scene.benchmark;
  if (scene.stage < 8 || !scene.showBenchmark) return null;
  let status = "Bấm Đo runtime để đo ba phương pháp.";
  if (job)
    status = job.running
      ? `Đang đo: ${job.rows.length}/3 phương pháp xong, ${job.timings.length}/5 batch hiện tại.`
      : job.failed
        ? "Đã dừng vì quá thời gian hoặc dữ liệu không hợp lệ."
        : job.rows.length === 3
          ? "Đã đo xong. Không mặc định phương pháp nào luôn nhanh nhất."
          : "Đã hủy; kết quả chưa đủ ba phương pháp.";
  return (
    <section aria-label="Benchmark JavaScript">
      <p role="status">{status}</p>
      <table>
        <caption>Runtime JavaScript trong trình duyệt — không phải thời gian C++/SDL3</caption>
        <thead>
          <tr>
            <th>Integrator</th>
            <th>Median µs/step</th>
            <th>State error tại T</th>
            <th>Steps/batch</th>
            <th>Force evals/batch</th>
          </tr>
        </thead>
        <tbody>
          {job?.rows.map((row) => (
            <tr key={row.kind}>
              <th>{INTEGRATOR_NAMES[row.kind]}</th>
              <td>
                {row.microsecondsPerStep > 0
                  ? row.microsecondsPerStep.toFixed(5)
                  : "dưới độ phân giải clock"}
              </td>
              <td>{integratorNumber(row.phaseSpaceError, " m")}</td>
              <td>{row.work.steps}</td>
              <td>{row.work.forceEvaluations}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Mỗi batch chạy 16 trajectory độc lập từ cùng initial state, mỗi trajectory có N=floor(2/dt)
        bước; T=N×dt. Bỏ warmup, lấy median của 5 batch. Không đo vẽ Canvas hay ghi history. Mỗi
        frame chỉ chạy một batch, có thể dừng hoặc đổi cấu hình để hủy. Số lần tính lực không phải
        thời gian chạy; không chia error cho số lần tính lực để xếp hạng.
      </p>
      {job && (
        <p>
          Checksum các batch đã xong:{" "}
          {job.rows.map((row) => row.work.checksum.toExponential(5)).join(" / ") || "chưa có"}.
        </p>
      )}
    </section>
  );
}
