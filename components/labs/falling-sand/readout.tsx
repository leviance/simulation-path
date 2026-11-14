import { materialNames, orderNames } from "@/lib/labs/falling-sand/model";
import { validationPassed } from "@/lib/labs/falling-sand/validation";
import type { Summary } from "@/lib/labs/falling-sand/session";

export function SandReadout({ summary }: { summary: Summary }) {
  const index = summary.cursor.y * summary.width + summary.cursor.x;
  const items = [
    {
      label: "Lưới",
      value: `${summary.width} × ${summary.height} · ${summary.width * summary.height} ô`,
    },
    { label: "Trạng thái", value: summary.paused ? "Đang dừng" : "Đang chạy" },
    {
      label: "Ô đang chọn",
      value: `(${summary.cursor.x}, ${summary.cursor.y}) · index ${index} · ${materialNames[summary.cell]}`,
    },
    { label: "Số ô cát / nước", value: `${summary.counts[2]} / ${summary.counts[3]}` },
    { label: "Số ô tường / trống", value: `${summary.counts[1]} / ${summary.counts[0]}` },
    { label: "Tick", value: String(summary.tick) },
  ];
  if (summary.stage >= 3) {
    items.push({
      label: "Ô đã xét / swap",
      value: `${summary.stats.visited} / ${summary.stats.swaps}`,
    });
    items.push({ label: "Cờ tại ô chọn", value: String(Number(summary.moved)) });
  }
  if (summary.stage >= 6) {
    items.push({ label: "Thời gian bỏ qua", value: `${summary.dropped.toFixed(3)} s mô hình` });
    items.push({
      label: "Update gần nhất",
      value: `${summary.updateMs.toFixed(2)} ms CPU/tick · không gồm vẽ`,
    });
  }
  if (summary.stage >= 7) {
    items.push({
      label: "Grid + moved mask",
      value: `${summary.gridBytes} bytes · chưa tính ảnh và runtime`,
    });
    items.push({ label: "Checksum vật liệu", value: String(summary.checksum) });
  }
  if (summary.stage >= 8) {
    items.push({
      label: "Seed đang áp dụng",
      value: `${summary.seed} · chỉ Hỗn hợp có cách xếp theo seed`,
    });
    items.push({ label: "Thứ tự đang áp dụng", value: orderNames[summary.order] });
  }
  if (summary.stage >= 9) {
    let report = "Chưa chạy";
    if (summary.report) {
      report = "FAIL";
      if (validationPassed(summary.report)) report = "PASS · rơi/biên/nước/bảo toàn/tường";
    }
    items.push({ label: "Fixture chuẩn riêng", value: report });
  }
  return (
    <dl className="lab-readout" aria-live={summary.paused ? "polite" : "off"}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
