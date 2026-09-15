import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 24 Collision Tank exposes pair cost, correction and pointer kick", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/collision-tank/08-stress-test-bao-toan-va-nghiem-thu");
  const canvas = page.locator('canvas[aria-label^="Bể va chạm"]');
  const controls = page.locator(".lab-controls");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / substep" })
    .locator("dd");
  const pairChecks = page
    .locator(".lab-readout div")
    .filter({ hasText: "Pair checks" })
    .locator("dd");
  const capture = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(pairChecks).toHaveText("30888 = 3 × 10296");
  await controls.getByLabel("Số bóng").selectOption("16");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(pairChecks).toHaveText("360 = 3 × 120");
  await controls.getByLabel("Solver iterations").selectOption("5");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(pairChecks).toHaveText("600 = 5 × 120");
  await controls.getByLabel("Positional correction").uncheck();
  await controls.getByLabel("Contact normal").uncheck();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35);
    await page.mouse.down();
    await expect(capture).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.35);
    await page.mouse.up();
  }
  await expect(capture).toContainText("đã nhả");
  await page.getByRole("button", { name: "Chạy nhanh 2 giây" }).click();
  await expect(elapsed).toContainText("2.017 s");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});
