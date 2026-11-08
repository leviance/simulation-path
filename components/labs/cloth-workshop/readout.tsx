"use client";
import type { ClothView } from "@/lib/labs/cloth-workshop/controller";
import { length, sub } from "@/lib/labs/cloth-workshop/math";
const notes: Record<string, string> = {
  surface:
    "Bắt đầu từ một bề mặt: hai góc vàng có inverse mass = 0. Chạy vải để trọng lực, gió và constraints tạo nếp gấp; camera không tham gia solver.",
  prediction:
    "Prediction: v ← exp(−damping·h)(v + a·h), x* ← x + h·v. Gió ở mẫu CPU là gia tốc Z và 0,12 lần theo X, không phải khí động học áp suất.",
  xpbd: "Distance XPBD: Δλ = [−C − (compliance/h²)λ] / [wₐ + wᵦ + compliance/h²]. λ reset đầu mỗi substep, giữ qua iterations; w=0 không nhận correction.",
  topology:
    "Stretch nối cạnh ngang/dọc; shear nối hai đường chéo; bend-distance nối cách hai cạnh. Đây là xấp xỉ uốn theo khoảng cách, không phải năng lượng dihedral của vải may mặc.",
  coloring:
    "Màu constraint là quyền sở hữu hai endpoint: không có hai cạnh cùng màu ghi vào cùng vertex. CPU đi tuần tự từng màu greedy; native dùng scheme 12 màu riêng, không hứa quỹ đạo giống bit.",
  timestep:
    "Một frame vật lý = 1/60 s, 2 substeps h=1/120 s; 2–12 iterations hữu hạn. Compliance không loại hết sai số iteration/timestep. Thời gian wall bị bỏ được báo, không bù bằng bước khổng lồ.",
  obstacles:
    "Plane y=0, sphere r=1,35 m và capsule r=0,45 m dùng signed-distance/normal analytic. Vật cản chỉ dịch X ≤0,5 m/s khi bước/chạy; mẫu rời rạc này không phải CCD.",
  grid: "Grid 3D thưa với cell size = 2·thickness; tọa độ cell = floor(x/cellSize), kể cả tọa độ âm. Các cell không xuất hiện có count=0. Chỉ vẽ tối đa 16 cell quanh ID chọn.",
  csr: "Counts → exclusive offsets → scatter IDs → 27 cell stencil. offsets cuối = N; mỗi ID có đúng một slot trong range cell của nó. Bảng chỉ hiển thị tám cell có dữ liệu đầu tiên.",
  "self-contact":
    "Predicate |xₐ−xᵦ| < 2·thickness sau khi loại lân cận topology Chebyshev ≤2; xử lý mỗi pair a<b. Không bảo đảm chống mọi giao cắt cạnh/tam giác hoặc tốc độ cao. Debug chỉ vẽ tối đa 24 contact.",
  normals:
    "Normals là tổng có trọng số diện tích các mặt kề rồi chuẩn hóa từ mesh sau solve. Ánh sáng hai mặt, xanh phía trước và đất nung phía sau; pattern theo topology cho thấy stretch/folds.",
  interaction:
    "Camera, Kéo vùng và Ghim bằng click là ba công cụ riêng. Drag vùng 1-ring có trần 6 m/s; khi Pause chỉ cập nhật mục tiêu, bước đơn mới đổi vị trí. Pin sửa inverse mass ngay khi Pause.",
  validation:
    "12 fixture hữu hạn kiểm CSR/contact IDs so brute force độc lập: state hiện tại, cell âm/sát biên, đỉnh trùng. Chia một fixture mỗi frame và hủy sau 5 giây; không phải phép đo/kiểm GPU.",
  showcase:
    "Canvas TypeScript chỉ là baseline CPU 289/625 đỉnh. Sản phẩm native C++/SDL3 phải cập nhật ≥100.000 đỉnh động bằng GPU; một triệu là mốc mở rộng riêng, cần bằng chứng native và GPU timings thực.",
};
export default function Readout({ state }: { state: ClothView }) {
  const { mesh, diagnostics: d } = state,
    pinned = mesh.vertices.filter((v) => v.w === 0).length,
    v = mesh.vertices[state.selected];
  const constraint = mesh.constraints.find(
    (c) => c.a === state.selected || c.b === state.selected,
  )!;
  const constraintError =
    length(sub(mesh.vertices[constraint.a].p, mesh.vertices[constraint.b].p)) - constraint.rest;
  const xyz = (p: { x: number; y: number; z: number }) =>
    [p.x, p.y, p.z].map((value) => value.toFixed(4)).join(", ");
  const values = [
    ["Động / ghim — CPU", `${mesh.vertices.length - pinned} / ${pinned}`],
    ["Cập nhật động / vẽ mỗi bước", `${mesh.vertices.length - pinned} / ${mesh.vertices.length}`],
    ["Triangles / constraints", `${mesh.triangles.length} / ${mesh.constraints.length}`],
    ["Colors / substeps / iterations", `${mesh.colors.length} / 2 / ${state.settings.iterations}`],
    ["Max |ΔL| / strain", `${d.residual.toExponential(2)} m / ${(d.strain * 100).toFixed(2)}%`],
    ["Penetration analytic", `${d.penetration.toExponential(2)} m`],
    ["Candidates / contacts — hiện tại", `${d.candidates} / ${d.contacts}`],
    [
      "t / wall bỏ / obstacle X",
      `${state.seconds.toFixed(3)} s / ${state.discarded.toFixed(3)} s / ${state.settings.obstacleX.toFixed(3)} m`,
    ],
  ];
  return (
    <>
      <p className="lab-hint" role="status">
        {state.message}
      </p>
      <dl className="lab-readout">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="lab-hint" data-testid="cloth-probe">
        ID {state.selected} · XYZ [{[v.p.x, v.p.y, v.p.z].map((x) => x.toFixed(4)).join(", ")}] m ·
        velocity [{[v.v.x, v.v.y, v.v.z].map((x) => x.toFixed(3)).join(", ")}] m/s · w={v.w} kg⁻¹ ·
        cell [{d.grid.coordinates[d.grid.vertexCells[state.selected]].join(", ")}].
      </p>
      <p className="lab-hint">{notes[state.mode] ?? notes.surface}</p>
      {["xpbd", "topology", "coloring", "timestep"].includes(state.mode) && (
        <p className="lab-hint" data-testid="cloth-constraint">
          Cạnh {constraint.a} → {constraint.b} · {constraint.kind} · color {constraint.color} · L₀=
          {constraint.rest.toFixed(5)} m · C={constraintError.toExponential(3)} m · λ=
          {constraint.lambda.toExponential(3)} kg·m · wₐ/wᵦ={mesh.vertices[constraint.a].w}/
          {mesh.vertices[constraint.b].w} kg⁻¹. λ này thuộc substep cuối đã giải; trước bước đầu
          bằng 0.
        </p>
      )}
      {state.mode === "prediction" && (
        <p className="lab-hint">
          ID {state.selected}, substep cuối: previous [{xyz(v.previous)}] → predicted [
          {xyz(v.predicted)}] → solved [{xyz(v.p)}] m. Khi chưa bước, ba trạng thái trùng nhau.
        </p>
      )}
      {["grid", "csr", "self-contact"].includes(state.mode) && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>CSR CPU — tối đa tám cell có dữ liệu</caption>
            <thead>
              <tr>
                <th>Cell XYZ</th>
                <th>Count</th>
                <th>Offset begin</th>
                <th>Offset end</th>
                <th>IDs (≤8)</th>
              </tr>
            </thead>
            <tbody>
              {d.grid.keys.slice(0, 8).map((key, i) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{d.grid.counts[i]}</td>
                  <td>{d.grid.offsets[i]}</td>
                  <td>{d.grid.offsets[i + 1]}</td>
                  <td>
                    {d.grid.ids
                      .slice(
                        d.grid.offsets[i],
                        Math.min(d.grid.offsets[i] + 8, d.grid.offsets[i + 1]),
                      )
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="lab-hint" role="status">
        {state.validation.message}
      </p>
      {state.validation.status === "running" && (
        <progress
          aria-label="Tiến độ oracle CPU"
          value={state.validation.completed}
          max={state.validation.total}
        />
      )}
      <p className="lab-hint">
        CPU có mass mẫu 1 kg/đỉnh, shear compliance = 2×stretch, bend-distance = 40×stretch. Damping
        có đơn vị s⁻¹; tiếp xúc giảm vận tốc tiếp tuyến với hệ số 12 s⁻¹, khác compliance. Bounds
        X/Z ±5 m, Y 0–8 m; topology 2-ring exclusion. Budget ≤400.000 candidates; vượt budget báo
        lỗi, không cắt contacts âm thầm. JS heap và GPU timings chưa đo trong Canvas.
      </p>
      <p className="lab-hint">
        Mẫu CPU cập nhật toàn bộ constraints/contact/normal; đường debug chỉ là subset. Canvas không
        chứng nhận mốc native ≥100.000 đỉnh động hoặc một triệu. CPU greedy coloring và tham số minh
        họa khác preset native: không dùng để kết luận speedup hay quỹ đạo GPU giống bit.
      </p>
    </>
  );
}
