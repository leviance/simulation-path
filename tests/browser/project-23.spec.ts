import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 23 Integrator Race steps, measures cost and resets its experiment", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/integrator-race/07-stress-test-convergence-va-nghiem-thu");
  const canvas = page.locator('canvas[aria-label^="Cuộc đua integrator"]');
  const controls = page.locator(".lab-controls");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / step" })
    .locator("dd");
  const evaluations = page
    .locator(".lab-readout div")
    .filter({ hasText: "Force evaluations" })
    .locator("dd");
  const capture = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width))
    .toBeGreaterThan(300);
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(evaluations).toHaveText("1 / 2 / 4");
  await controls.getByLabel("Fixed dt").selectOption({ label: "1/15 s" });
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Chạy nhanh 20 giây" }).click();
  await expect(elapsed).toContainText("20.000 s / 300");
  await controls.getByLabel("Graph").selectOption("energy");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
    const scale = Math.min(box.width / 1100, box.height / 820);
    const left = box.x + (box.width - 1100 * scale) / 2;
    const top = box.y + (box.height - 820 * scale) / 2;
    await page.mouse.move(left + 810 * scale, top + 140 * scale);
    await page.mouse.down();
    await expect(capture).toContainText("đang kéo");
    await page.mouse.move(left + 700 * scale, top + 140 * scale);
    await page.mouse.up();
  }
  await expect(capture).toContainText("đã nhả");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});

test("Project 23 changes integrators fairly and measures actual JavaScript runtime", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/integrator-race/08-do-runtime-va-hoan-thien-cuoc-dua");
  const canvas = page.locator('canvas[aria-label^="Cuộc đua integrator"]');
  await expect(canvas).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width))
    .toBeGreaterThan(300);
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / step" })
    .locator("dd");
  const evaluations = page
    .locator(".lab-readout div")
    .filter({ hasText: "Force evaluations" })
    .locator("dd");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(evaluations).toHaveText("1 / 2 / 4");
  await page.getByLabel("Integrator làn 1", { exact: true }).selectOption("rk4");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(evaluations).toHaveText("4 / 2 / 4");
  await page.getByRole("button", { name: "Đo runtime", exact: true }).click();
  const panel = page.getByRole("region", { name: "Benchmark JavaScript" });
  await expect(panel.getByRole("status")).toContainText("Đã đo xong");
  await expect(panel.locator("tbody tr")).toHaveCount(3);
  await expect(panel.locator("caption")).toContainText("không phải thời gian C++/SDL3");
  await expect(elapsed).toHaveText("0.033 s / 1");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByLabel("Fixed dt", { exact: true }).selectOption({ label: "1/60 s" });
  await expect(elapsed).toHaveText("0.000 s / 0");
  await expect(panel).toHaveCount(0);
  await canvas.focus();
  await canvas.press("Control+n");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await canvas.press("n");
  await expect(elapsed).toHaveText("0.017 s / 1");
  await canvas.press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
