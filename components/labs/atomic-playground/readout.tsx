import type { AtomicSession } from "@/lib/labs/atomic-playground/session";
import type { Measurement } from "@/lib/labs/atomic-playground/statistics";
import type { AtomicView } from "@/lib/labs/atomic-playground/view";
import { orbital } from "@/lib/labs/atomic-playground/catalog";
import { LabReadout } from "../lab-shared";
import type { PaintCounts } from "./paint";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 5 }).format;
function percent(value: number) {
  return `${number(value * 100)}%`;
}
export function AtomicReadout({
  session,
  secondary,
  view,
  measurement,
  counts,
}: {
  session: AtomicSession;
  secondary: AtomicSession;
  view: AtomicView;
  measurement: Measurement | null;
  counts: PaintCounts;
}) {
  const cloud = session.active,
    table = cloud?.tables,
    job = session.job;
  const items = [
    { label: "Phạm vi", value: "Canvas 2D / CPU nhỏ; không phải GPU triệu mẫu" },
    {
      label: "Cloud A đang vẽ",
      value: `${session.label} · seed ${cloud?.config.seed ?? "—"} · generation ${cloud?.generation ?? "—"}`,
    },
    {
      label: "Cấu hình muốn nhận",
      value: `${orbital(session.requested.orbital).label} · seed ${session.requested.seed} · generation ${session.generation}`,
    },
    {
      label: "Trạng thái",
      value: `${session.paused ? "PAUSE · " : ""}${job?.phase ?? "idle"} · ${session.current ? "current" : "last-good / chưa có cloud"}`,
    },
    {
      label: "Requested / generated / accepted",
      value: `${number(session.requested.count)} / ${number(job?.generated ?? 0)} / ${number(session.current ? (cloud?.count ?? 0) : 0)} (candidate)`,
    },
    {
      label: "Active / trong khung chiếu",
      value: `${number(cloud?.count ?? 0)} / ${number(counts.primary)} (A; chưa phải phép đếm fragment)`,
    },
    {
      label: "Giữ sau clipping / N đo",
      value: `${number(measurement?.clipped ?? 0)} / ${number(measurement?.total ?? 0)}; mẫu số không normalize theo clipping`,
    },
    {
      label: "R_max / tail radial bỏ",
      value: table ? `${table.rMax} a₀ / ${table.tail.toExponential(3)}` : "—",
    },
    {
      label: "Table CPU",
      value: table
        ? `${table.radialBins} radial × ${table.muBins} μ × ${table.phiBins} φ; midpoint, PDF xấp xỉ`
        : "—",
    },
    {
      label: "Tích phân radial / angular",
      value: table
        ? `${number(table.radial.integral)} / ${number(table.angular.integral)}; CDF đã normalize riêng`
        : "—",
    },
    {
      label: "Record bytes A active + candidate",
      value: `${number((cloud?.records.byteLength ?? 0) + (job?.phase === "generating" ? job.records.byteLength : 0))}; chưa gồm bảng/overhead JS`,
    },
  ];
  if (view.compare) {
    items.push({
      label: "Cloud B / scale",
      value: `${secondary.label} · N=${number(secondary.active?.count ?? 0)} · seed ${secondary.active?.config.seed ?? "—"} · ${secondary.current ? "current" : "last-good/chờ"} · chung camera/a₀ với A`,
    });
    items.push({
      label: "B requested / generated / trong khung",
      value: `${secondary.requested.count} / ${secondary.job?.generated ?? 0} / ${counts.secondary} · ${secondary.job?.phase ?? "idle"}`,
    });
    items.push({
      label: "Record bytes B active + candidate",
      value: number(
        (secondary.active?.records.byteLength ?? 0) +
          (secondary.job?.phase === "generating" ? secondary.job.records.byteLength : 0),
      ),
    });
  }
  return (
    <>
      <LabReadout items={items} />
      {session.notice && (
        <p role="status" className="lab-note">
          {session.notice}
        </p>
      )}
      <p className="lab-note">
        {cloud
          ? orbital(cloud.config.orbital).formula
          : "Field được cung cấp; chờ cloud hoàn chỉnh."}{" "}
        · ρ=|RY|². Palette phase mã hóa dấu amplitude được cung cấp, không phải điện tích hai loại
        hạt.
      </p>
      {view.inspect && measurement && (
        <>
          <LabReadout
            items={[
              {
                label: "Vùng đo / N toàn cloud",
                value: `${measurement.inside} / ${measurement.total} = ${percent(measurement.fraction)}`,
              },
              { label: "SE lấy mẫu (xấp xỉ nhị thức)", value: percent(measurement.standardError) },
              {
                label: "Reference vùng / chênh quadrature",
                value: `${percent(measurement.regionReference)} / ${percent(measurement.quadratureDifference)}`,
              },
            ]}
          />
          <p className="lab-fallback">
            Reference của cầu tâm gốc dùng radial CDF closed-form; cầu dịch tâm dùng quadrature theo
            hai độ phân giải. Chênh hai quadrature là chỉ báo, không phải bound đã chứng minh. SE
            không bao gồm table/tail và không là khoảng tin cậy đáng tin ở vùng có rất ít mẫu.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <caption>
                Histogram radial A · xác suất có điều kiện r ≤ R_max; reference không đổi khi chỉnh
                clipping hoặc opacity
              </caption>
              <thead>
                <tr>
                  <th>Khoảng r / R_max</th>
                  <th>Tỉ lệ mẫu</th>
                  <th>Reference closed-form</th>
                </tr>
              </thead>
              <tbody>
                {measurement.radialObserved.map((value, index) => (
                  <tr key={index}>
                    <td>
                      {number(index / 12)}–{number((index + 1) / 12)}
                    </td>
                    <td>{percent(value)}</td>
                    <td>{percent(measurement.radialExpected[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
