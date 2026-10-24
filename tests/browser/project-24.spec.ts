import { expect, test, type Page } from "@playwright/test";
function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}
const readout = (page: Page, label: string) =>
  page.locator(".lab-readout div").filter({ hasText: label }).locator("dd");
test("Project 24 2D validation keeps exact pair cost, correction and bounded stepping", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto("/projects/collision-tank/08-stress-test-bao-toan-va-nghiem-thu");
  const canvas = page.locator('canvas[aria-label^="Bể va chạm"]');
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
  const elapsed = readout(page, "Elapsed / substep"),
    pairs = readout(page, "Pair checks");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(pairs).toContainText("97920 = 3 × 32640");
  await page.getByLabel("Số bóng", { exact: true }).selectOption("64");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(pairs).toContainText("6048 = 3 × 2016");
  await page.getByLabel("Solver iterations", { exact: true }).selectOption("5");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(pairs).toContainText("10080 = 5 × 2016");
  await page.getByLabel("Positional correction", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Chạy nhanh 2 giây", exact: true }).click();
  await expect(elapsed).toContainText("2.000 s");
  await expect(page.getByLabel("Không gian mô phỏng", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});
test("Project 24 final switches real 3D, orbits without moving physics, spawns and resets", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto("/projects/collision-tank/11-hoan-thien-spawn-debug-va-nghiem-thu");
  const canvas = page.locator('canvas[aria-label^="Bể va chạm"]');
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
  const elapsed = readout(page, "Elapsed / substep"),
    capture = readout(page, "pointer capture"),
    count = readout(page, "Không gian / số vật thể");
  await page.getByRole("button", { name: "Thêm tối đa 16 bóng", exact: true }).click();
  await expect(count).toHaveText("2D / 272");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const scale = Math.min(box.width / 1100, box.height / 820),
      left = box.x + (box.width - 1100 * scale) / 2,
      top = box.y + (box.height - 820 * scale) / 2;
    await page.mouse.move(left + 128.125 * scale, top + 618.125 * scale);
    await page.mouse.down();
    await expect(capture).toContainText("đang kéo");
    await page.mouse.move(left + 173.125 * scale, top + 618.125 * scale);
    await page.mouse.up();
    await expect(capture).toContainText("đã nhả");
    await expect(
      page.getByRole("status").filter({ hasText: "Kick là tác động bên ngoài" }),
    ).toBeVisible();
  }
  await page.getByLabel("Không gian mô phỏng", { exact: true }).selectOption("3");
  await expect(count).toHaveText("3D / 256");
  await page.getByLabel("Góc camera yaw", { exact: true }).press("ArrowRight");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(readout(page, "Pair checks")).toContainText("97920");
  await page.getByRole("button", { name: "Thêm tối đa 16 bóng", exact: true }).click();
  await expect(count).toHaveText("3D / 272");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await canvas.press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(count).toHaveText("2D / 256");
  expect(errors).toEqual([]);
});
