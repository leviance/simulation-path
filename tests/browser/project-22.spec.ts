import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 22 Projectile Lab aims, steps and measures Euler error", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/projectile-cannon/07-do-sai-so-va-nghiem-thu");

  const canvas = page.locator('canvas[aria-label^="Mô phỏng projectile"]');
  const controls = page.locator(".lab-controls");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / substep" })
    .locator("dd");
  const positionError = page
    .locator(".lab-readout div")
    .filter({ hasText: "Position error" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(positionError).toHaveText("0.00000 m");
  await controls.getByLabel("Fixed dt").selectOption({ label: "1/15 s" });
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(elapsed).toContainText("0.067 s / 1");
  await expect(positionError).not.toHaveText("0.00000 m");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await canvas.hover({ position: { x: 200, y: Math.round(box.height * 0.35) } });
    await page.mouse.down();
    await expect(captureState).toHaveText("đang kéo");
    await page.mouse.move(box.x + 260, box.y + box.height * 0.28);
    await page.mouse.up();
  }
  await expect(captureState).toHaveText("đã nhả");

  await controls.getByLabel("Góc bắn").fill("60");
  await controls.getByLabel("Tốc độ đầu").fill("24");
  await page.getByRole("button", { name: "Bắn lại" }).click();
  await page.getByRole("button", { name: /Tạm dừng|Tiếp tục/ }).click();
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(positionError).toHaveText("0.00000 m");
  expect(errors).toEqual([]);
});
