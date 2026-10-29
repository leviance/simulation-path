export type MeasurementScope = "cpu" | "kernel" | "end-to-end";
export const PIPELINE_STEPS = [
  "Upload A/B + reset output",
  "Dispatch",
  "Memory barrier",
  "Fence / completion wait",
  "Readback N+256",
  "Kiểm kết quả",
  "Công bố dashboard",
] as const;

export function includedSteps(scope: MeasurementScope) {
  if (scope === "kernel") return [1];
  if (scope === "end-to-end") return [0, 1, 2, 3, 4];
  return []; // CPU loop là nhánh riêng, không phải một giai đoạn chạy trên GPU.
}

export function scopeDescription(scope: MeasurementScope) {
  if (scope === "cpu")
    return "steady_clock quanh loop CPU trên output đã cấp phát; không tính generation, allocation hoặc validation.";
  if (scope === "kernel")
    return "GL_TIME_ELAPSED chỉ bao quanh DispatchCompute; query pending được giữ tới availability rồi mới đọc và dùng lại.";
  return "steady_clock từ upload A/B và reset output tới readback N+256; gồm fence wait, không gồm generation/allocation, CPU reference, validation hoặc UI. Poll granularity vẫn ảnh hưởng số đo.";
}
