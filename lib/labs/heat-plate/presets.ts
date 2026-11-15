import { createField, defaultSettings, paintDisk, type HeatSettings } from "./model.ts";

export const presetNames = [
  "Điểm nóng Gaussian",
  "Trường hằng 0,4",
  "Bàn cờ: thử bất ổn",
  "Mode cosine (4,4)",
  "Hai vùng giữ nhiệt",
  "Tấm trống",
] as const;

export function makeField(preset = 0, size = 32, stage = 9) {
  if (!Number.isInteger(preset) || preset < 0 || preset >= presetNames.length)
    throw new Error("Cảnh mẫu phải từ 0 đến 5.");
  const field = createField(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      let value = 0;
      if (preset === 0) {
        value = Math.exp(-72 * ((u - 0.5) ** 2 + (v - 0.5) ** 2));
        if (stage === 3 && y !== Math.floor(size / 2)) value = 0;
      } else if (preset === 1) value = 0.4;
      else if (preset === 2) {
        value = 0.25;
        if ((x + y) % 2 !== 0) value = 0.75;
      } else if (preset === 3)
        value = 0.5 + 0.25 * Math.cos(4 * Math.PI * u) * Math.cos(4 * Math.PI * v);
      else if (preset === 4) value = 0.15;
      field.current[y * size + x] = value;
    }
  }
  if (stage >= 5 && preset === 4) {
    const settings = defaultSettings();
    const radius = Math.max(1, Math.floor(size / 24));
    paintDisk(field, settings, Math.floor(size / 3), Math.floor(size / 2), radius, 1, "heater");
    paintDisk(
      field,
      settings,
      Math.floor((size * 2) / 3),
      Math.floor(size / 2),
      radius,
      0,
      "heater",
    );
  }
  return field;
}

export function settingsForSize(size: number): HeatSettings {
  if (!Number.isInteger(size) || size < 1 || size > 512)
    throw new Error("Độ phân giải không hợp lệ.");
  return { ...defaultSettings(), dx: 96 / size, dy: 96 / size };
}
