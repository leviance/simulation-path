"use client";
/* eslint jsx-a11y/no-noninteractive-tabindex: ["error", {"roles": ["region"]}] -- Labelled horizontal scroll regions need keyboard focus. */
import { floatFields, modelTraffic, type MemoryWorkload } from "@/lib/labs/fountain/state";
import { particleAt, type FountainScene } from "@/lib/labs/fountain/scene";
import type { BenchmarkProgress } from "@/lib/labs/fountain/worker-protocol";
import { LabReadout } from "../lab-shared";

export default function FountainResults({
  scene,
  result,
  workload,
  debug,
}: {
  scene: FountainScene;
  result: BenchmarkProgress | null;
  workload: MemoryWorkload;
  debug: boolean;
}) {
  const particle = particleAt(scene, scene.selected);
  const aos = modelTraffic(scene.count, "aos", workload);
  const soa = modelTraffic(scene.count, "soa", workload);
  const fields = ["id", "generation", ...floatFields] as const;
  return (
    <>
      {debug && (
        <>
          <LabReadout
            items={[
              {
                label: `Slot ${scene.selected}`,
                value:
                  scene.selected < scene.active
                    ? `ID ${particle.id} · generation ${particle.generation}`
                    : "Chưa được phát; slot đã cấp phát không có nghĩa đang sống",
              },
              {
                label: "Position (m)",
                value: `(${particle.positionX.toFixed(3)}, ${particle.positionY.toFixed(3)}, ${particle.positionZ.toFixed(3)})`,
              },
              {
                label: "Velocity (m/s)",
                value: `(${particle.velocityX.toFixed(3)}, ${particle.velocityY.toFixed(3)}, ${particle.velocityZ.toFixed(3)})`,
              },
              {
                label: "Age / lifetime (s)",
                value: `${particle.age.toFixed(4)} / ${particle.lifetime.toFixed(4)} · hue ${particle.hue.toFixed(3)}`,
              },
              {
                label: "Payload C++ theo N hiện tại",
                value: `${((scene.count * 44) / 1e6).toFixed(3)} MB / layout; không phải số đo heap object JavaScript`,
              },
              {
                label: "SoA TypedArray đang giữ",
                value: `${Object.values(scene.soa)
                  .reduce((sum, array) => sum + array.byteLength, 0)
                  .toLocaleString("vi-VN")} B (kể cả buffer của layout không hoạt động)`,
              },
            ]}
          />
          <p>
            Hạt mới có lõi trắng, chuyển dần sang xanh lam theo tuổi. Mặt lưới XZ luôn hiện, mỗi ô
            rộng 1 m và đường chính cách nhau 5 m. Đây chỉ là mốc không gian, chưa có va chạm với
            sàn; hạt dưới mặt phẳng bị che nhưng vẫn được mô phỏng. Emitter, vận tốc phóng và
            lifetime mới áp dụng cho lần sinh kế tiếp; gravity tác động ngay ở bước sau. Đặt lại để
            tạo lại tất cả bằng cấu hình hiện tại.
          </p>
          {scene.stage >= 4 && (
            <div
              className="lab-table"
              role="region"
              aria-label="Bố trí các field trong bộ nhớ"
              tabIndex={0}
              style={{ overflowX: "auto", maxWidth: "100%" }}
            >
              <table>
                <caption>
                  {scene.layout === "aos"
                    ? "AoS: record của một hạt gồm 11 field, 44 byte trong C++"
                    : "SoA: 11 mảng độc lập; mỗi field của hai hạt kế nhau cách 4 byte"}
                  . Slot đang xem: {scene.selected}.
                </caption>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Giá trị</th>
                    <th>Địa chỉ tương đối C++</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field}>
                      <th scope="row">{field}</th>
                      <td>{index < 2 ? particle[field] : particle[field].toFixed(4)}</td>
                      <td>
                        {scene.layout === "aos"
                          ? `base + ${44 * scene.selected + 4 * index}`
                          : `${field}.data() + ${4 * scene.selected} byte`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {scene.stage >= 6 && (
            <>
              <LabReadout
                items={[
                  {
                    label: "Mô hình cache line AoS / SoA",
                    value: `${aos.uniqueLines.toLocaleString("vi-VN")} / ${soa.uniqueLines.toLocaleString("vi-VN")} line 64 B`,
                  },
                  {
                    label: "Useful bytes theo mô hình",
                    value: `${aos.usefulBytes.toLocaleString("vi-VN")} B · ${workload === "gravity-only" ? "chỉ velocityY" : "cận trên khi chạm mọi field"}`,
                  },
                ]}
              />
              <p>
                Đây là phép đếm địa chỉ giả định base của từng mảng thẳng hàng 64 B, không phải bộ
                đếm cache miss. Toàn vòng đời chỉ chạm ID/generation/hue ở một số nhánh, nên con số
                mọi field là cận trên. Object JavaScript không có layout 44 B; dùng benchmark
                Release C++ để kết luận về bộ nhớ CPU.
              </p>
            </>
          )}
        </>
      )}
      {result && (
        <section aria-label="Kết quả benchmark đài phun">
          <p role="status">
            {result.notice}{" "}
            {result.active &&
              `Ca ${Math.min(result.caseIndex + 1, result.caseCount)}/${result.caseCount} · ${result.sample < 0 ? "warm-up" : `mẫu ${result.sample + 1}/5`} · ${result.phase}${result.paused ? " · đang tạm dừng" : ""}`}
          </p>
          {result.rows.length > 0 && (
            <div
              className="lab-table"
              role="region"
              aria-label="Các dòng benchmark đã hoàn tất"
              tabIndex={0}
              style={{ overflowX: "auto", maxWidth: "100%" }}
            >
              <table>
                <caption>
                  JavaScript worker: 1 warm-up + 5 mẫu, mỗi mẫu 3 pass đủ N. AB/BA luân phiên;
                  copy/conversion/checksum ngoài timer kernel. Không đại diện tốc độ C++.
                </caption>
                <thead>
                  <tr>
                    <th>N / workload</th>
                    <th>Updated / mẫu</th>
                    <th>AoS median [min–max] ms</th>
                    <th>SoA median [min–max] ms</th>
                    <th>AoS / SoA</th>
                    <th>Copy / conversion ms</th>
                    <th>Error ratio / checksum</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.count + row.workload}>
                      <th scope="row">
                        {row.count.toLocaleString("vi-VN")} / {row.workload}
                      </th>
                      <td>{row.updated.toLocaleString("vi-VN")}</td>
                      <td>
                        {row.aos.median.toFixed(4)} [{row.aos.minimum.toFixed(4)}–
                        {row.aos.maximum.toFixed(4)}]
                      </td>
                      <td>
                        {row.paired
                          ? `${row.soa.median.toFixed(4)} [${row.soa.minimum.toFixed(4)}–${row.soa.maximum.toFixed(4)}]`
                          : "Chưa đo SoA"}
                      </td>
                      <td>
                        {row.paired && row.soa.median > 0
                          ? `${(row.aos.median / row.soa.median).toFixed(2)}×`
                          : "Không tính"}
                      </td>
                      <td>
                        {row.copyMs.toFixed(3)} / {row.paired ? row.conversionMs.toFixed(3) : "—"}
                      </td>
                      <td>
                        {row.paired
                          ? row.maximumErrorRatio.toExponential(2) + " (≤ 1 đạt)"
                          : "AoS only"}
                        <br />
                        {row.checksumAoS.toPrecision(10)}
                        {row.paired && <> / {row.checksumSoA.toPrecision(10)}</>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            ID/generation phải khớp chính xác, NaN/Inf bị từ chối. Mỗi field dùng |Δ| ≤ absTol +
            10⁻⁶ × max(|a|,|b|): absTol position 10⁻⁵ m, velocity 10⁻⁵ m/s, age/lifetime 10⁻⁶ s, hue
            10⁻⁷. Error ratio là tỉ lệ lớn nhất giữa |Δ| và ngưỡng của chính field đó, không phải
            trộn các đơn vị thành một sai số vật lý.
          </p>
          <p>
            AoS/SoA &lt; 1 nghĩa là SoA chậm hơn trong lần đo này; không loại bỏ kết quả đó. Độ phân
            giải đồng hồ có thể cho 0 ms ở N nhỏ, khi ấy không tính tỉ số. Bảng giữ cả các ca chậm
            hơn và chỉ nhận dòng đã kiểm chứng đầy đủ. Giới hạn worker: 30 giây, kể cả lúc pause;
            watchdog phía giao diện: 35 giây.
          </p>
        </section>
      )}
    </>
  );
}
