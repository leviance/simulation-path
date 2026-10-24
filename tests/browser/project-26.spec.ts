import { expect, test, type Page } from "@playwright/test";
function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}
const route = "/projects/double-pendulum-chaos/07-preset-tuong-tac-va-nghiem-thu";
const readout = (page: Page, label: string) =>
  page.locator(".lab-readout div").filter({ hasText: label }).locator("dd");
const canvasOf = (page: Page) => page.locator('canvas[aria-label^="Hai double pendulum"]');
test("Project 26 runs the same 10-second experiment with a finer step", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(route);
  await expect(canvasOf(page)).toBeVisible();
  await expect
    .poll(async () => (await canvasOf(page).boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(500);
  const elapsed = readout(page, "Elapsed / bước physics");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(elapsed).toHaveText("0.004 s / 1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByRole("button", { name: "Chạy thử 10 giây", exact: true }).click();
  await expect(elapsed).toHaveText("10.000 s / 2400", { timeout: 25000 });
  await expect(readout(page, "Độ tách phase space d")).toHaveText(/2\.12\d+e-1/);
  await page.getByLabel("Fixed dt", { exact: true }).selectOption("4");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Chạy thử 10 giây", exact: true }).click();
  await expect(elapsed).toHaveText("10.000 s / 4800", { timeout: 25000 });
  await expect(readout(page, "Độ tách phase space d")).toHaveText(/2\.12\d+e-1/);
  await expect(readout(page, "Numerical shadow separation")).not.toContainText("NaN");
  expect(errors).toEqual([]);
});
test("Project 26 captures the actual bob, accepts final release and cancels a job", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto(route);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await page.getByLabel("Preset con lắc", { exact: true }).selectOption("calm");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const scale = Math.min(box.width / 1100, box.height / 820),
      left = box.x + (box.width - 1100 * scale) / 2,
      top = box.y + (box.height - 820 * scale) / 2;
    const x = left + (285 + 90 * (Math.sin(0.2) + Math.sin(0.3)) + 1) * scale,
      y = top + (315 + 90 * (Math.cos(0.2) + Math.cos(0.3))) * scale;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(readout(page, "Finite / pointer")).toContainText("đang kéo");
    await page.mouse.move(x + 30 * scale, y);
    await page.mouse.up();
    await expect(readout(page, "Finite / pointer")).toContainText("đã nhả");
  }
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Chạy nhanh 30 giây", exact: true }).click();
  await page.getByRole("button", { name: "Dừng job", exact: true }).click();
  await expect(readout(page, "History / fast job")).toContainText("còn 0 bước");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Khôi phục mặc định", exact: true }).click();
  await page.getByLabel("Nhiễu góc ban đầu", { exact: true }).selectOption("0");
  await page.getByRole("button", { name: "Chạy thử 10 giây", exact: true }).click();
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("10.000 s / 2400", {
    timeout: 25000,
  });
  await expect(readout(page, "Độ tách phase space d")).toHaveText("0.000000e+0 · không đơn vị");
  await expect(readout(page, "Tăng trưởng hữu hạn log(d/d₀)/t")).toContainText("Chưa xác định");
  expect(errors).toEqual([]);
});
test("Project 26 geometry lesson does not expose future simulation controls", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/projects/double-pendulum-chaos/01-bieu-dien-double-pendulum-bang-goc");
  await expect(canvasOf(page)).toBeVisible();
  await page.getByLabel("Góc ban đầu theta2", { exact: true }).press("ArrowRight");
  await expect(readout(page, "Chiều dài hai thanh")).toHaveText("1.00000 / 1.00000 m");
  await expect(page.getByLabel("Fixed dt", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Nhiễu góc ban đầu", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
