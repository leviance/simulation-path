import { edge, sample, type HeatField, type HeatSettings } from "./model.ts";

export function stability(settings: HeatSettings, stage = 9) {
  const { diffusivity: D, dt, dx, dy, boundary } = settings;
  const dx2 = dx * dx;
  const dy2 = dy * dy;
  let valid =
    [D, dt, dx, dy, dx2, dy2].every(Number.isFinite) &&
    D >= 0 &&
    dt > 0 &&
    dx > 0 &&
    dy > 0 &&
    dx2 > 0 &&
    dy2 > 0 &&
    (boundary === "insulated" || boundary === "rim");
  const rx = (D * dt) / dx2;
  let ry = 0;
  if (stage >= 4) ry = (D * dt) / dy2;
  const sum = rx + ry;
  valid = valid && Number.isFinite(sum);
  let maximumDt = Infinity;
  if (sum > 0) maximumDt = dt * (0.5 / sum);
  return { valid, rx, ry, sum, maximumDt, stable: valid && sum <= 0.5 };
}

export type StepStatus = "advanced" | "invalid" | "unstable" | "nonfinite" | "budget" | "amplitude";
export type StepResult = {
  status: StepStatus;
  visited: number;
  maximumAbs: number;
  sourceChange: number;
  advanced: boolean;
};
export const emptyStep = (): StepResult => ({
  status: "invalid",
  visited: 0,
  maximumAbs: 0,
  sourceChange: 0,
  advanced: false,
});
export const stepMessages: Record<StepStatus, string> = {
  advanced: "Đã tiến một bước thời gian mô hình.",
  invalid: "Thông số không hợp lệ hoặc bài này chưa cập nhật nhiệt; lưới giữ nguyên.",
  unstable: "Bước bị chặn vì rx+ry > 0,5. Giảm D/dt hoặc chủ động bật thí nghiệm bất ổn.",
  nonfinite: "Ứng viên có NaN/Infinity; giữ trạng thái hợp lệ cuối cùng.",
  budget: "Đã đủ 400 bước thí nghiệm. Reset trước khi thử tiếp.",
  amplitude: "Ứng viên vượt |theta| = 16; dừng trước khi ghi nhận, không cắt giá trị nghiệm.",
};

/** One old time level -> one candidate. Only a fully accepted candidate becomes visible. */
export function diffuse(field: HeatField, settings: HeatSettings, stage = 9): StepResult {
  const result = emptyStep();
  const coefficients = stability(settings, stage);
  if (stage < 3 || !coefficients.valid) return result;
  const allowUnstable = stage >= 6 && settings.experiment;
  if (allowUnstable && field.experimentSteps >= 400) {
    result.status = "budget";
    return result;
  }
  if (!coefficients.stable && !allowUnstable) {
    result.status = "unstable";
    return result;
  }
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      const index = y * field.width + x;
      result.visited++;
      const fixedRim = stage >= 5 && settings.boundary === "rim" && edge(field, x, y);
      let value = 0;
      if (!fixedRim) {
        const center = sample(field, x, y);
        const horizontal = sample(field, x - 1, y) - 2 * center + sample(field, x + 1, y);
        value = center + coefficients.rx * horizontal;
        if (stage >= 4) {
          const vertical = sample(field, x, y - 1) - 2 * center + sample(field, x, y + 1);
          value += coefficients.ry * vertical;
        }
      }
      if (stage >= 5 && !fixedRim && field.pins[index] !== -1) {
        const target = field.pins[index];
        result.sourceChange += (target - value) * settings.dx * settings.dy;
        value = target;
      }
      if (!Number.isFinite(value)) {
        result.status = "nonfinite";
        return result;
      }
      result.maximumAbs = Math.max(result.maximumAbs, Math.abs(value));
      field.next[index] = value;
    }
  }
  if (allowUnstable && result.maximumAbs > 16) {
    result.status = "amplitude";
    return result;
  }
  const previous = field.current;
  field.current = field.next;
  field.next = previous;
  field.tick++;
  field.time += settings.dt;
  if (allowUnstable) field.experimentSteps++;
  result.advanced = true;
  result.status = "advanced";
  return result;
}
