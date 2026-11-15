import type { Summary } from "@/lib/labs/heat-plate/session";

export function HeatReadout({ summary: s }: { summary: Summary }) {
  const items = [
    { label: "Lưới", value: `${s.size} × ${s.size} · ${s.size * s.size} ô` },
    { label: "Trạng thái", value: s.paused ? "Đang dừng" : "Đang chạy" },
    {
      label: "Ô đang chọn",
      value: `(${s.cursor.x}, ${s.cursor.y}) · theta = ${s.theta.toPrecision(6)}`,
    },
    {
      label: "Min / max theta",
      value: `${s.stats.minimum.toPrecision(6)} / ${s.stats.maximum.toPrecision(6)}`,
    },
  ];
  if (s.stage >= 3)
    items.push(
      { label: "Thời gian / tick", value: `${s.time.toFixed(4)} s mô hình / ${s.tick}` },
      {
        label: "Tích phân I*",
        value: `${s.stats.integral.toPrecision(9)} · theta × diện tích, không phải Joule`,
      },
    );
  if (s.stage >= 5)
    items.push({
      label: "Heater",
      value: `${s.stats.activePins} ô giữ nhiệt, không phải nguồn công suất cố định`,
    });
  if (s.stage >= 6)
    items.push(
      {
        label: "Ổn định của scheme",
        value: `rx+ry = ${s.stability.sum.toFixed(5)}; cần ≤ 0,5 · ${s.stability.stable ? "đạt" : "không đạt"}`,
      },
      {
        label: "dx / dy / dt tối đa",
        value: `${s.settings.dx} / ${s.settings.dy} / ${s.settings.diffusivity === 0 ? "không có CFL bound khi D=0" : s.stability.maximumDt.toFixed(6) + " s mô hình"}`,
      },
      {
        label: "Ô xét / update",
        value: `${s.lastStep.visited} / ${s.updateMs.toFixed(3)} ms JavaScript, không gồm vẽ`,
      },
      {
        label: "Thời gian bỏ qua",
        value: `${s.dropped.toFixed(5)} s mô hình; không bù vô hạn sau khi tab bị chậm`,
      },
    );
  if (s.stage >= 7)
    items.push({
      label: "Bộ nhớ số",
      value: `${s.bytes} bytes cho current + next + pins; chưa tính ảnh/runtime`,
    });
  if (s.stage >= 8)
    items.push({
      label: "Probe",
      value: `(${s.probe.x}, ${s.probe.y}) · theta = ${s.probeTheta.toPrecision(6)}`,
    });
  if (s.stage >= 9)
    items.push({
      label: "Fixture nhỏ chuẩn riêng",
      value: s.report
        ? s.report.passed
          ? "PASS · không thay nghiệm thu UI/quy mô"
          : "FAIL"
        : "Chưa chạy",
    });
  return (
    <>
      <dl className="lab-readout" aria-live={s.paused ? "polite" : "off"}>
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {s.stage >= 8 && <History summary={s} />}
    </>
  );
}

function History({ summary: s }: { summary: Summary }) {
  const samples = s.history;
  if (samples.length < 2)
    return (
      <p className="lab-note">Đặt probe, rồi tiến vài bước để vẽ theta theo thời gian mô hình.</p>
    );
  const minimum = Math.min(...samples.map((point) => point.theta));
  const maximum = Math.max(...samples.map((point) => point.theta));
  const span = Math.max(0.01, maximum - minimum);
  const start = samples[0].time;
  const duration = Math.max(1e-9, samples[samples.length - 1].time - start);
  const points = samples
    .map(
      (point) =>
        `${50 + ((point.time - start) / duration) * 480},${140 - ((point.theta - minimum) / span) * 110}`,
    )
    .join(" ");
  return (
    <figure className="lab-note">
      <figcaption>
        Theta tại probe theo giây mô hình — trục y tự đổi phạm vi, không phải thang màu heatmap.
      </figcaption>
      <svg
        viewBox="0 0 580 180"
        role="img"
        aria-label={`Probe từ t=${start.toFixed(3)} đến ${(start + duration).toFixed(3)}; theta từ ${minimum.toPrecision(4)} đến ${maximum.toPrecision(4)}`}
        style={{ width: "100%", maxHeight: 240 }}
      >
        <path d="M50 20V140H540" fill="none" stroke="currentColor" opacity="0.5" />
        <polyline points={points} fill="none" stroke="#49bba6" strokeWidth={2} />
        <text x={50} y={163} fill="currentColor" fontSize={12}>
          {start.toFixed(3)} s
        </text>
        <text x={465} y={163} fill="currentColor" fontSize={12}>
          {(start + duration).toFixed(3)} s
        </text>
        <text x={55} y={16} fill="currentColor" fontSize={12}>
          y: {minimum.toPrecision(4)} … {maximum.toPrecision(4)}
        </text>
      </svg>
    </figure>
  );
}
