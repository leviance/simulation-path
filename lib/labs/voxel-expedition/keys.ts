// Những lệnh chỉ chạy một lần khi nhấn: giữ phím không đặt lại cả chuyến đi.
export function fieldCommand(key: string, repeat = false) {
  const value = key.toLowerCase();
  if (["r", " ", ".", "m"].includes(value) && repeat) return "handled";
  if (value === "r") return "reset";
  if (value === " ") return "pause";
  if (value === ".") return "step";
  if (value === "m") return "mesh";
  if (
    ["w", "s", "a", "d", "q", "e", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(
      value,
    )
  )
    return value;
  return null;
}
