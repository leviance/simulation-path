"use client";

import {
  makeDispatchPlan,
  std430ByteOffset,
  validateCapabilities,
  validationPassed,
  type Vec4,
} from "@/lib/labs/million-vector-gpu";
import { labView, probeData, type VectorLabState } from "@/lib/labs/million-vector-gpu/controller";
import { selectedLimits, CAPABILITY_LABELS } from "@/lib/labs/million-vector-gpu/render";
import { scopeDescription } from "@/lib/labs/million-vector-gpu/scopes";
import { LabReadout } from "../lab-shared";

function vector(value: Vec4) {
  return [value.x, value.y, value.z, value.w]
    .map((component) => component.toPrecision(7))
    .join(", ");
}

export default function VectorReadout({
  state,
  reducedMotion,
}: {
  state: Readonly<VectorLabState>;
  reducedMotion: boolean;
}) {
  const plan = makeDispatchPlan(state.elementCount, state.localSize);
  const probe = probeData(state);
  const view = labView(state.mode);
  const group = state.mode === "dispatch-tail" ? plan.workgroupCount - 1 : 0;
  const global = group * state.localSize + state.selectedLane;
  const report = probe.report;
  const capabilities = validateCapabilities(selectedLimits(state), plan);
  const failed = Object.values(capabilities).flatMap((passed, index) =>
    passed ? [] : [CAPABILITY_LABELS[index]],
  );
  return (
    <LabReadout
      items={[
        {
          label: "Dispatch plan",
          value: `${plan.elementCount.toLocaleString("vi-VN")} phần tử · ${plan.workgroupCount.toLocaleString("vi-VN")} group × ${plan.localSize} lane · ${plan.unusedInvocations} lane dư`,
        },
        ...(view === "group"
          ? [
              {
                label: "Invocation được chọn",
                value: `group ${group} · local ${state.selectedLane} · global ${global} · ${global < plan.elementCount ? `xử lý output[${global}]` : "return trước mọi lần đọc/ghi"}`,
              },
            ]
          : []),
        ...(view === "layout"
          ? [
              {
                label: "Địa chỉ std430",
                value: `i=${state.selectedIndex} · byte ${std430ByteOffset(state.selectedIndex)} · component ${["x", "y", "z", "w"][state.component]} tại +${state.component * 4} byte`,
              },
            ]
          : []),
        ...(view === "limits"
          ? [
              {
                label: "Preflight giả định",
                value: failed.length
                  ? `FAIL: ${failed.join(", ")}`
                  : "6/6 điều kiện đạt, gồm padding N+256. Đây không phải kiểm GPU của máy bạn.",
              },
            ]
          : []),
        ...(view === "vectors"
          ? [
              {
                label: `A[${state.selectedIndex}] / B[${state.selectedIndex}]`,
                value: `${vector(probe.a)} / ${vector(probe.b)}`,
              },
              {
                label: "CPU reference JS / mẫu thử JS",
                value: `${vector(probe.expected)} / ${state.injectedError === "missing" ? "không có output" : vector(probe.actual)}`,
              },
              {
                label: "Kiểm mẫu, không kiểm toàn mảng",
                value: `${validationPassed(report) ? "PASS" : "FAIL"} · tolerance ${report.tolerancesValid ? "hợp lệ" : "không hợp lệ"} · ${report.mismatchCount} phần tử sai · max error ${report.maximumAbsoluteError.toExponential(3)} · component lỗi ${report.firstMismatchComponent === null ? "không có" : ["x", "y", "z", "w"][report.firstMismatchComponent]}`,
              },
            ]
          : []),
        ...(view === "barrier"
          ? [
              {
                label: "Visibility và completion",
                value:
                  state.barrierMode === "correct"
                    ? "BUFFER_UPDATE mô tả consumer GetBufferSubData; fence là bước chờ completion riêng."
                    : "Thiếu hợp đồng visibility phù hợp. Dữ liệu có thể tình cờ trông đúng; mô hình không khẳng định GPU chắc chắn trả output cũ.",
              },
            ]
          : []),
        ...(view === "timing" || view === "barrier" || state.mode === "vector-gpu-final"
          ? [{ label: "Phạm vi đo đang xem", value: scopeDescription(state.scope) }]
          : []),
        {
          label: "Trạng thái tương tác",
          value: `${state.paused ? "Đã dừng" : "Đang đi từng bước"} · bước ${state.tourStep} · pointer ${state.pointer === null ? "đã nhả" : "đang capture"}${reducedMotion ? " · reduced motion: chỉ bước thủ công" : ""}`,
        },
        {
          label: "Mô tả thay thế",
          value:
            "Canvas 2D chỉ minh họa Vec4, địa chỉ, dispatch và phạm vi đo; không dùng WebGL/WASM, không phải phép đo GPU của trình duyệt. Để kiểm đủ một triệu phần tử và xem timing thật, chạy ứng dụng C++ ở Release.",
        },
      ]}
    />
  );
}
