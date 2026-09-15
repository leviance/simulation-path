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
    await page.mouse.move(box.x + box.width * 0.72, box.y + 45);
    await page.mouse.down();
    await expect(capture).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.64, box.y + 45);
    await page.mouse.up();
  }
  await expect(capture).toContainText("đã nhả");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});
