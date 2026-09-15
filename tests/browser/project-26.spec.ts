import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 26 runs twins, changes experiment inputs and captures the second bob", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/double-pendulum-chaos/07-preset-tuong-tac-va-nghiem-thu");

  const canvas = page.locator('canvas[aria-label^="Hai double pendulum"]');
  const controls = page.locator(".lab-controls");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / steps" })
    .locator("dd");
  const separation = page
    .locator(".lab-readout div")
    .filter({ hasText: "Phase-space / bob separation" })
    .locator("dd");
  const pointer = page
    .locator(".lab-readout div")
    .filter({ hasText: "Finite / frame guard / pointer" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(elapsed).toHaveText("0.004 s / 1");
  await expect(separation).not.toContainText("NaN");

  await controls.getByLabel("Preset").selectOption("calm");
  await controls.getByLabel("Perturbation").selectOption("0.01");
  await controls.getByLabel("Fixed dt").selectOption({ label: "1/120 s" });
  await expect(elapsed).toHaveText("0.000 s / 0");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.48);
    await page.mouse.down();
    await expect(pointer).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.42);
    await page.mouse.up();
  }
  await expect(pointer).toContainText("đã nhả");

  await page.getByRole("button", { name: "Chạy nhanh 30 giây" }).click();
  await expect(elapsed).toContainText("30.000 s");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});
