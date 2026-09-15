import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 27 queries 100k particles, benchmarks and captures the lens", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/brute-force-particle-query/07-hoan-thien-kinh-lup-va-nghiem-thu");

  const canvas = page.locator('canvas[aria-label^="Đám mây particle"]');
  const controls = page.locator(".lab-controls");
  const workload = page
    .locator(".lab-readout div")
    .filter({ hasText: "Particles scanned / hits" })
    .locator("dd");
  const benchmark = page
    .locator(".lab-readout div")
    .filter({ hasText: "Benchmark / checksum" })
    .locator("dd");
  const pointer = page
    .locator(".lab-readout div")
    .filter({ hasText: "Auto probe / pointer" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(workload).toContainText("100.000");
  await controls.getByLabel("Số particles").selectOption("10000");
  await expect(workload).toContainText("10.000");
  await controls.getByLabel("Query radius").fill("0.15");

  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.42);
    await page.mouse.down();
    await expect(pointer).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.48);
    await page.mouse.up();
  }
  await expect(pointer).toContainText("đã nhả");

  await page.getByRole("button", { name: "Chạy benchmark" }).click();
  await expect(benchmark).not.toHaveText("chưa chạy");
  await page.getByRole("button", { name: "Chạy scaling" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(workload).toContainText("100.000");
  await expect(benchmark).toHaveText("chưa chạy");
  expect(errors).toEqual([]);
});
