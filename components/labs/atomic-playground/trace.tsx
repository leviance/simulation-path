import { useId, useMemo, useState } from "react";
import { traceSample } from "@/lib/labs/atomic-playground/sampler";
import type { Cloud } from "@/lib/labs/atomic-playground/session";
import { orbital } from "@/lib/labs/atomic-playground/catalog";
import { LabReadout } from "../lab-shared";

function scalar(value: number) {
  return Number(value.toPrecision(10)).toString();
}
function interval(values: readonly [number, number]) {
  return `[${scalar(values[0])}, ${scalar(values[1])})`;
}

export function AtomicTrace({ cloud }: { cloud: Cloud | null }) {
  const prefix = useId();
  const [selectedId, setSelectedId] = useState(0);
  const sampleId = Math.min(selectedId, (cloud?.count ?? 1) - 1);
  const trace = useMemo(
    () =>
      cloud ? traceSample(cloud.tables, sampleId, cloud.config.seed, cloud.config.sampling) : null,
    [cloud, sampleId],
  );
  if (!cloud || !trace)
    return (
      <p className="lab-note">
        Chờ cloud A được nhận để xem trace của chính các mẫu đang vẽ; không dùng cấu hình candidate
        làm nhãn cho mẫu cũ.
      </p>
    );
  const dr = cloud.tables.rMax / cloud.tables.radialBins;
  const stored = cloud.records.slice(sampleId * 8, sampleId * 8 + 3);
  const xyz = [trace.sample.point.x, trace.sample.point.y, trace.sample.point.z];
  return (
    <section aria-labelledby={`${prefix}-title`} data-atomic-trace="true">
      <h3 id={`${prefix}-title`}>Theo dấu một mẫu qua CDF</h3>
      <div className="lab-controls">
        <label htmlFor={`${prefix}-id`}>
          Sample ID A{" "}
          <input
            id={`${prefix}-id`}
            type="number"
            min={0}
            max={cloud.count - 1}
            step={1}
            value={sampleId}
            style={{ width: 100 }}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 0 && value < cloud.count)
                setSelectedId(value);
            }}
          />
        </label>
        <span>
          {orbital(cloud.config.orbital).label} · seed {cloud.config.seed} · generation{" "}
          {cloud.generation} · {cloud.config.sampling}
        </span>
      </div>
      <LabReadout
        items={[
          {
            label: "u₀ chọn bin r / u₁ jitter r",
            value: `${scalar(trace.uniforms[0])} / ${scalar(trace.uniforms[1])}`,
          },
          {
            label: "radialBin / CDF[bin,bin+1)",
            value: `${trace.radialBin} / ${interval(trace.radialCdf)}`,
          },
          {
            label: "Khoảng r trong bin / r cuối",
            value: `${interval([trace.radialBin * dr, (trace.radialBin + 1) * dr])} / ${scalar(trace.sample.r)} a₀`,
          },
          { label: "u₂ chọn angularBin", value: scalar(trace.uniforms[2]) },
          {
            label: "angularBin / CDF[bin,bin+1)",
            value: `${trace.angularBin} / ${interval(trace.angularCdf)}`,
          },
          {
            label: "muBin / phiBin",
            value: `${trace.muBin} / ${trace.phiBin}; angularBin = muBin × ${cloud.tables.phiBins} + phiBin`,
          },
          {
            label: "u₃ jitter μ / u₄ jitter φ",
            value: `${scalar(trace.uniforms[3])} / ${scalar(trace.uniforms[4])}`,
          },
          { label: "μ = cos θ / φ", value: `${scalar(trace.mu)} / ${scalar(trace.phi)} rad` },
          { label: "XYZ trước ghi record", value: xyz.map(scalar).join(", ") },
          { label: "XYZ trong Float32 record đang vẽ", value: [...stored].map(scalar).join(", ") },
          {
            label: "density / sign",
            value: `${scalar(trace.sample.density)} / ${trace.sample.sign}`,
          },
        ]}
      />
      <p className="lab-note">
        Trace gọi đúng phép tính mà sampler dùng khi sinh cloud, không phải ví dụ được dựng riêng. Ở
        weighted: CDF[bin] ≤ u &lt; CDF[bin+1], r=(radialBin+u₁)Δr; μ=−1+2(muBin+u₃)/muBins;
        φ=2π(phiBin+u₄)/phiBins. XYZ=(r√(1−μ²)cosφ, r√(1−μ²)sinφ, rμ). Chênh nhỏ giữa hai hàng XYZ
        là lần ép sang Float32.
      </p>
      {trace.mode !== "weighted" && (
        <p className="lab-note">
          Sandbox sai đang bật:{" "}
          {trace.mode === "uniformRadius"
            ? "r cuối bị thay bằng u₀R_max; radialBin/CDF vẫn được tính nhưng không còn quyết định r."
            : "μ bị thay bằng cos(πu₃), φ bằng 2πu₄; angularBin/CDF vẫn được tính nhưng không còn quyết định hướng."}{" "}
          Chọn weighted để theo dõi toàn bộ đường CDF đúng.
        </p>
      )}
    </section>
  );
}
