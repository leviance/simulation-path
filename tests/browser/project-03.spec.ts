import { expect, test, type Page } from "@playwright/test";

function readout(page: Page, label: string) {
  return page
    .locator(".lab-readout div")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");
}

test("Project 03 brush inspector displays the thirteen-pixel raster fixture", async ({ page }) => {
  await page.goto("/projects/mini-paint/02-brush-tron");
  await expect(page.locator('canvas[aria-label^="Canvas phóng to"]')).toBeVisible();
  await expect(readout(page, "Pixel đã tô")).toHaveText("13");
  await expect(page.getByLabel("Giữ 1 trên N mẫu")).toHaveCount(0);
});

test("Project 03 keyboard creates independent strokes and does not trap Tab", async ({ page }) => {
  await page.goto("/projects/mini-paint/06-validation");
  const canvas = page.locator('canvas[aria-label^="Canvas thử"]');
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await canvas.focus();
  await canvas.press("Enter");
  await canvas.press("ArrowRight");
  await canvas.press("Enter");
  await canvas.press("ArrowDown");
  await canvas.press("Enter");
  await canvas.press("ArrowLeft");
  await canvas.press("Enter");
  await expect(readout(page, "Số nét độc lập")).toHaveText("2");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});

test("Project 03 sampling contrast and manual reduced-motion operation remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/mini-paint/04-stroke-interpolation");
  await page.getByLabel("Giữ 1 trên N mẫu").fill("8");
  await expect(readout(page, "Khoảng dấu bút lớn nhất")).toHaveText("4.73 px");
  await page.getByLabel("Nội suy", { exact: true }).uncheck();
  await expect(readout(page, "Khoảng dấu bút lớn nhất")).toHaveText("260.00 px");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByLabel("Bán kính bút")).toBeDisabled();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Nội suy", { exact: true })).toBeChecked();
});
