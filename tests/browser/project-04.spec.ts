import { expect, test } from "@playwright/test";

const read = (page: import("@playwright/test").Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");

test("Project 04 line stepper, swap, keyboard and pause work on the actual Canvas", async ({
  page,
}) => {
  await page.goto("/projects/tiny-2d-rasterizer/02-bresenham");
  await page.getByLabel("Trường hợp", { exact: true }).selectOption("tie");
  await expect(read(page, "Số pixel toàn đoạn")).toHaveText("3");
  await page.getByRole("button", { name: "Bước tiếp", exact: true }).click();
  await expect(read(page, "Pixel được chọn")).toHaveText("(9, 7)");
  await page.getByRole("button", { name: "Đảo A/B", exact: true }).click();
  await page.getByRole("button", { name: "Bước tiếp", exact: true }).click();
  await expect(read(page, "Pixel được chọn")).toHaveText("(9, 6)");
  const canvas = page.locator('canvas[aria-label^="Lưới raster đường thẳng"]');
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(read(page, "Điểm B")).toHaveText("(9, 6)");
  await canvas.press("Space");
  await canvas.press("ArrowRight");
  await expect(read(page, "Điểm B")).toHaveText("(9, 6)");
  await expect(page.getByRole("button", { name: "Bước tiếp", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tạm dừng", exact: true })).toBeVisible();
});

test("Project 04 rectangle includes both boundaries and supports degenerate presets", async ({
  page,
}) => {
  await page.goto("/projects/tiny-2d-rasterizer/04-rectangle");
  await page.getByLabel("Trường hợp", { exact: true }).selectOption("point");
  await expect(read(page, "Số pixel")).toHaveText("1");
  await page.getByLabel("Kiểu vẽ", { exact: true }).selectOption("filled");
  await expect(read(page, "Số pixel")).toHaveText("1");
  await page.getByLabel("Trường hợp", { exact: true }).selectOption("row");
  await expect(read(page, "Số pixel")).toHaveText("14");
  await page.getByRole("button", { name: "Đảo hai góc", exact: true }).click();
  await expect(read(page, "Số pixel")).toHaveText("14");
});

test("Project 04 circle teaches a real midpoint fill and validates zero-radius behavior", async ({
  page,
}) => {
  await page.goto("/projects/tiny-2d-rasterizer/05-midpoint-circle");
  await page.getByLabel("Preset bán kính", { exact: true }).selectOption("2");
  await page.getByLabel("Kiểu vẽ", { exact: true }).selectOption("filled");
  await expect(read(page, "Tổng pixel đang thấy")).toHaveText("21");
  await page.getByLabel("Preset bán kính", { exact: true }).selectOption("0");
  await expect(read(page, "Tổng pixel đang thấy")).toHaveText("1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read(page, "Bán kính")).toHaveText("5");
});
