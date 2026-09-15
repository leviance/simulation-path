import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 28 rebuilds its grid, matches checksum and captures the query", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/spatial-grid-neighbor-query/08-hoan-thien-spatial-grid-va-nghiem-thu");

  const canvas = page.locator('canvas[aria-label^="Spatial Grid"]');
  const controls = page.locator(".lab-controls");
  const grid = page
    .locator(".lab-readout div")
    .filter({ hasText: "Grid / occupancy" })
    .locator("dd");
  const match = page
    .locator(".lab-readout div")
    .filter({ hasText: "Grid / brute-force oracle" })
    .locator("dd");
  const benchmark = page
    .locator(".lab-readout div")
    .filter({ hasText: "Benchmark grid / brute" })
    .locator("dd");
  const pointer = page
    .locator(".lab-readout div")
    .filter({ hasText: "Auto probe / pointer" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(grid).toContainText("20×20");
  await controls.getByLabel("Cell size").selectOption("0.1");
  await expect(grid).toContainText("10×10");
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

  await page.getByRole("button", { name: "So benchmark" }).click();
  await expect(benchmark).not.toHaveText("chưa chạy");
  await expect(match).toContainText("checksum khớp");
  await page.getByRole("button", { name: "Chạy cell-size study" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(grid).toContainText("20×20");
  await expect(benchmark).toHaveText("chưa chạy");
  expect(errors).toEqual([]);
});
