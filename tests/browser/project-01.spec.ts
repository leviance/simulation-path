import { expect, test, type Page } from "@playwright/test";

function readout(page: Page, label: string) {
  return page
    .locator(".lab-readout div")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");
}

test("Project 01 memory presets expose exact source dimensions, row-major and pitch", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/hello-pixels/02-framebuffer-la-gi");
  const canvas = page.locator('canvas[aria-label^="Lưới pixel"]');
  await expect(canvas).toBeVisible();
  await page.getByLabel("Kích thước mẫu").selectOption("4x3");
  await canvas.focus();
  await canvas.press("End");
  await expect(readout(page, "Pixel đang chọn")).toHaveText("(3, 2)");
  await expect(readout(page, "Linear index")).toHaveText("2 × 4 + 3 = 11");
  await expect(readout(page, "Pitch (byte)")).toHaveText("4 × 4 = 16");
  await page.getByLabel(/^Width/).focus();
  await page.getByLabel(/^Width/).press("ArrowRight");
  await expect(readout(page, "Số phần tử")).toHaveText("5 × 3 = 15");
  await page.getByLabel("Kích thước mẫu").selectOption("1x1");
  await canvas.focus();
  await canvas.press("End");
  await expect(readout(page, "Linear index")).toHaveText("0 × 1 + 0 = 0");
  expect(errors).toEqual([]);
});

test("Project 01 RGBA writes one pixel and safely rejects out-of-bounds input", async ({
  page,
}) => {
  await page.goto("/projects/hello-pixels/03-putpixel-va-rgba");
  const canvas = page.locator('canvas[aria-label^="Lưới pixel"]');
  await expect(canvas).toBeVisible();
  const before = await readout(page, "Packed 0xRRGGBBAA").textContent();
  await page.getByLabel("X ghi thử").fill("-1");
  await page.getByRole("button", { name: "Thử putPixel" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bỏ qua tọa độ ngoài biên" }),
  ).toBeVisible();
  await expect(readout(page, "Packed 0xRRGGBBAA")).toHaveText(before ?? "");
  await page.getByLabel("X ghi thử").fill("3");
  await page.getByLabel("Y ghi thử").fill("2");
  await page.getByRole("button", { name: "Thử putPixel" }).click();
  await expect(readout(page, "Pixel đang chọn")).toHaveText("(3, 2)");
  await expect(readout(page, "Packed 0xRRGGBBAA")).toHaveText("0x53F0AEFF");
  await page.getByRole("button", { name: "Tạm dừng" }).click();
  await expect(page.getByRole("button", { name: "Thử putPixel" })).toBeDisabled();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout(page, "Pixel đang chọn")).toHaveText("(4, 3)");
});

test("Project 01 exposes all four scenes and reproduces a noise seed", async ({ page }) => {
  await page.goto("/projects/hello-pixels/04-pattern-dau-tien");
  const canvas = page.locator('canvas[aria-label^="Lưới pixel"]');
  await expect(canvas).toBeVisible();
  const scene = page.getByLabel("Scene", { exact: true });
  await expect(scene.locator("option")).toHaveCount(4);
  await scene.selectOption("noise");
  await canvas.focus();
  await canvas.press("Home");
  const seed17 = await readout(page, "Packed 0xRRGGBBAA").textContent();
  await page.getByLabel("Seed", { exact: true }).fill("18");
  await expect(readout(page, "Packed 0xRRGGBBAA")).not.toHaveText(seed17 ?? "");
  await page.getByLabel("Seed", { exact: true }).fill("17");
  await expect(readout(page, "Packed 0xRRGGBBAA")).toHaveText(seed17 ?? "");
  await scene.selectOption("solid");
  await expect(readout(page, "Packed 0xRRGGBBAA")).toHaveText("0x53F0AEFF");
});
