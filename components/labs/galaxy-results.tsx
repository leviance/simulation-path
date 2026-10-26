import type { GalaxyJob } from "@/lib/labs/galaxy/jobs";

function measurementContext(job: GalaxyJob): string {
  if (job.kind === "runtime")
    return `Dữ liệu đo riêng: N=256, 512, 1024; ${job.runtime.length}/3 quy mô hoàn tất. θ=${job.theta}, ε=${job.epsilon}.`;
  if (job.kind === "dt")
    return `Bài toán đối chiếu riêng: N=2, T=1, θ=0,5, ε=0,02; ${job.timestep.length}/3 dt hoàn tất.`;
  const snapshot = `Snapshot t=${job.time.toFixed(5)}, N=${job.bodies.length};`;
  if (job.kind === "sweep")
    return `${snapshot} ${job.sweeps.length}/4 giá trị θ hoàn tất${job.sweeps.length < 4 ? `, target hiện tại ${job.target}/${job.targets.length}` : `, ${job.targets.length}/${job.targets.length} target cho mỗi θ`}.`;
  return `${snapshot} đã xử lý ${job.target}/${job.bodies.length} body (mọi cặp i<j).`;
}

export default function GalaxyResults({ job }: { job: GalaxyJob | null }) {
  if (!job) return null;
  return (
    <section aria-label="Kết quả thí nghiệm N-body">
      <p role="status">
        {job.notice} {measurementContext(job)}
        {job.active && job.paused ? " Đang tạm dừng." : ""}
      </p>
      {job.sweeps.length > 0 && (
        <>
          <table>
            <caption>
              Sai số lực trên cùng {job.targets.length} target; sàn chuẩn hóa = 10⁻¹² acceleration
              unit
            </caption>
            <thead>
              <tr>
                <th>θ</th>
                <th>Absolute RMS</th>
                <th>Normalized RMS</th>
                <th>Mean/max relative</th>
                <th>Exact + aggregate</th>
              </tr>
            </thead>
            <tbody>
              {job.sweeps.map((row) => (
                <tr key={row.theta}>
                  <td>{row.theta}</td>
                  <td>{row.absolute.toExponential(3)}</td>
                  <td>{row.normalized.toExponential(3)}</td>
                  <td>
                    {row.meanRelative.toExponential(2)} / {row.maximumRelative.toExponential(2)}
                  </td>
                  <td>{row.work}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div role="img" aria-label="Biểu đồ normalized RMS theo theta">
            {job.sweeps.map((row) => (
              <div key={row.theta}>
                θ={row.theta}{" "}
                <meter
                  min={0}
                  max={Math.max(...job.sweeps.map((r) => r.normalized), 1e-12)}
                  value={row.normalized}
                />
              </div>
            ))}
          </div>
          <p>
            RMS chuẩn hóa = √(Σ‖aBH−aDirect‖² / max(Σ‖aDirect‖², K·10⁻²⁴)). Đây là sai số lực tại
            cùng snapshot, không phải độ lệch quỹ đạo sau nhiều bước.
          </p>
        </>
      )}
      {job.runtime.length > 0 && (
        <table>
          <caption>
            JavaScript full force pass; cùng preset/seed; 1 warm-up + 5 mẫu; median [min,max] ms,
            không gồm render/đợi RAF. C++ đo riêng tới N=4.096.
          </caption>
          <thead>
            <tr>
              <th>N</th>
              <th>Direct ms</th>
              <th>BH ms</th>
              <th>Build ms</th>
              <th>Direct/BH work</th>
            </tr>
          </thead>
          <tbody>
            {job.runtime.map((row) => (
              <tr key={row.count}>
                <td>{row.count}</td>
                <td>
                  {row.direct.toFixed(3)} [{row.directMin.toFixed(3)},{row.directMax.toFixed(3)}]
                </td>
                <td>
                  {row.tree.toFixed(3)} [{row.treeMin.toFixed(3)},{row.treeMax.toFixed(3)}]
                </td>
                <td>{row.build.toFixed(3)}</td>
                <td>
                  {row.directWork}/{row.treeWork}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {job.timestep.length > 0 && (
        <table>
          <caption>
            Hai vật quay tròn: T=1, theta=0,5 và epsilon=0,02 cố định; đối chiếu nghiệm tròn có
            softening, không dùng quỹ đạo hỗn loạn làm oracle.
          </caption>
          <thead>
            <tr>
              <th>dt</th>
              <th>Position error</th>
              <th>ΔE/|E₀|</th>
            </tr>
          </thead>
          <tbody>
            {job.timestep.map((row) => (
              <tr key={row.dt}>
                <td>{row.dt.toFixed(6)}</td>
                <td>{row.error.toExponential(4)}</td>
                <td>{row.energyDrift.toExponential(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
