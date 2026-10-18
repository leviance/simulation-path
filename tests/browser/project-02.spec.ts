import { expect, test, type Page } from "@playwright/test";

function readout(page: Page, label: string) {
  return page
    .locator(".lab-readout div")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");
}

test("Project 02 Motion Lab shows FPS comparison and graph keyboard inspection", async ({
  page,
}) => {
  await page.goto("/projects/wasd-fps-cap/03-loi-frame-based");
  await page.getByLabel("FPS thí nghiệm").selectOption("30");
  await page.getByRole("button", { name: "Tính ngay 5 giây" }).click();
  await expect(readout(page, "Frame-based")).toHaveText("450.0 px");
  await expect(readout(page, "Dùng dt")).toHaveText("900.0 px");
  const canvas = page.locator('canvas[aria-label^="So sánh quãng đường"]');
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await expect(readout(page, "Mốc đang đọc")).not.toContainText("5.00 s");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout(page, "Thời gian đo")).toHaveText("0.00 s");
});

test("Project 02 clamp remains inspectable without motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/wasd-fps-cap/04-delta-time");
  await expect(page.getByRole("button", { name: "Chạy / tiếp tục" })).toBeDisabled();
  await page.getByLabel("FPS thí nghiệm").selectOption("60");
  await page.getByLabel("Dãy thời gian").selectOption("stall");
  await page.getByRole("button", { name: "Tính ngay 5 giây" }).click();
  await expect(readout(page, "Dùng dt")).toHaveText("873.0 px");
  await expect(readout(page, "Thời gian bị bỏ")).toHaveText("0.150 s");
  await expect(readout(page, "Thời gian đã cập nhật")).toHaveText("4.850 s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(150);
  await expect(readout(page, "Thời gian đo")).toHaveText("5.00 s");
});
