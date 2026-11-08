"use client";

import { frustum, rejectedPlane, PLANE_NAMES } from "@/lib/labs/million-object-city/math";
import type { CityView } from "@/lib/labs/million-object-city/controller";
import { LabReadout } from "../lab-shared";

export default function CityReadout({ state }: { state: CityView }) {
  const { result } = state;
  const object = state.objects.find((object) => object.id === state.selected);
  const plane = object ? rejectedPlane(object, frustum(state.camera, state.aspect)) : -1;
  const showFixture = state.mode !== "city" && state.mode !== "frustum";
  return (
    <>
      <p className="lab-hint" role="status">
        {state.message}
      </p>
      <LabReadout
        items={[
          {
            label: "Resident / tested — CPU mẫu",
            value: `${state.objects.length} / ${state.objects.length}`,
          },
          {
            label: "Accepted / submitted",
            value: `${result.counts[3]} / ${result.commands.reduce((sum, command) => sum + command.instanceCount, 0)}`,
          },
          { label: "Ba nhóm mesh", value: result.counts.slice(0, 3).join(" / ") },
          {
            label: "Distance min / max — world units",
            value:
              result.minDistance === null
                ? "Tập rỗng: không có min/max"
                : `${result.minDistance.toFixed(2)} / ${result.maxDistance!.toFixed(2)}`,
          },
          {
            label: "Budget std430 minh họa — object / mask / prefix / IDs / command bytes",
            value: [
              state.objects.length * 48,
              state.objects.length * 16,
              state.objects.length * 16,
              state.objects.length * 4,
              60,
            ].join(" / "),
          },
          {
            label: "Camera XYZ",
            value: Object.values(state.camera.eye)
              .map((v) => v.toFixed(1))
              .join(", "),
          },
        ]}
      />
      {object && (
        <p className="lab-hint">
          ID <strong>{object.id}</strong> · mesh {object.mesh} · center [
          {Object.values(object.center)
            .map((v) => v.toFixed(2))
            .join(", ")}
          ] · half-size [
          {Object.values(object.half)
            .map((v) => v.toFixed(2))
            .join(", ")}
          ] · sphere r={object.radius.toFixed(2)}.{" "}
          {plane < 0
            ? "Bounds giao frustum: được nhận; vẫn có thể bị nhà khác che."
            : `Bounds nằm ngoài plane ${PLANE_NAMES[plane]}: bị loại nếu culling bật.`}{" "}
          Picking dùng AABB bảo thủ; mái/taper có thể không lấp đầy bounds.
        </p>
      )}
      {showFixture && (
        <details open>
          <summary>12 record đầu: mask → exclusive prefix → visible IDs → commands</summary>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Object ID</th>
                  <th>Mesh</th>
                  <th>Mask [M0,M1,M2,total]</th>
                  <th>Prefix [M0,M1,M2,total]</th>
                </tr>
              </thead>
              <tbody>
                {state.objects.slice(0, 12).map((object, i) => (
                  <tr key={object.id}>
                    <td>{object.id}</td>
                    <td>{object.mesh}</td>
                    <td>[{result.mask[i].join(", ")}]</td>
                    <td>[{result.prefix[i].join(", ")}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lab-hint">
            Visible IDs được nhóm theo mesh, tăng theo thứ tự record trong mỗi nhóm: [
            {result.visibleIds.slice(0, 24).join(", ")}
            {result.visibleIds.length > 24 ? ", …" : ""}]. Prefix thuộc toàn mẫu, không chỉ 12 dòng
            trên. Sum={result.counts[3]}, min ID={result.minId ?? "rỗng"}, max ID=
            {result.maxId ?? "rỗng"}.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Mesh</th>
                  <th>count</th>
                  <th>instanceCount</th>
                  <th>firstIndex</th>
                  <th>baseVertex</th>
                  <th>visibleOffset</th>
                </tr>
              </thead>
              <tbody>
                {result.commands.map((command, i) => (
                  <tr key={i}>
                    <td>{i}</td>
                    <td>{command.count}</td>
                    <td>{command.instanceCount}</td>
                    <td>{command.firstIndex}</td>
                    <td>{command.baseVertex}</td>
                    <td>{command.baseInstance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lab-hint">
            Trong OpenGL 4.3, shader nhận visibleOffset tương đương qua uniform/SSBO; không giả sử
            có gl_BaseInstance. Canvas mô hình hóa các phép tính bằng TypeScript, không dispatch
            compute hay indirect draw.
          </p>
        </details>
      )}
      <p className="lab-hint">
        Khi culling ON, accepted là số bounding sphere giao frustum; khi OFF, pipeline nhận toàn bộ
        record. Con số này không phải số nhà có pixel nhìn thấy. Màu vàng trên bản đồ debug luôn
        tính theo sáu plane, kể cả khi culling OFF. Frustum culling không phải occlusion culling.
        Đổi culling không đổi hình học scene. Budget byte minh họa layout native, không phải phép đo
        heap JavaScript. Bản C++ mới là nơi xét đủ một triệu record và đo GPU; ở đây không hiển thị
        số GPU timing giả.
      </p>
    </>
  );
}
