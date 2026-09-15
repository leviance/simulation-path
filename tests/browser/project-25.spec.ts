import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 25 Spring Chain steps, changes stability and captures a dragged mass", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/spring-chain/08-do-energy-stress-test-va-nghiem-thu");
  const canvas = page.locator('canvas[aria-label^="Chuỗi khối lượng"]');
  const controls = page.locator(".lab-controls");
  const topology = page
    .locator(".lab-readout div")
    .filter({ hasText: "Particles / springs" })
    .locator("dd");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Elapsed / substeps" })
    .locator("dd");
  const stability = page
    .locator(".lab-readout div")
    .filter({ hasText: "Stability index q" })
    .locator("dd");
  const pointer = page
    .locator(".lab-readout div")
    .filter({ hasText: "Anchor / finite / pointer" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(topology).toHaveText("18 / 17");
  await expect(elapsed).toHaveText("0.000 s / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(elapsed).toContainText("0.004 s / 1");
  await controls.getByLabel("Số particles").selectOption("8");
  await expect(topology).toHaveText("8 / 7");
  await controls.getByLabel("Stiffness").selectOption("600");
  await controls.getByLabel("Mass").selectOption("0.1");
  await controls.getByLabel("Fixed dt").selectOption({ label: "1/30 s" });
  await expect(stability).toContainText("2.5820");
  await controls.getByLabel("Gravity").uncheck();
  await controls.getByLabel("Axial damping").uncheck();
  await controls.getByLabel("Force vectors").check();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35);
    await page.mouse.down();
    await expect(pointer).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.4);
    await page.mouse.up();
  }
  await expect(pointer).toContainText("đã nhả");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(elapsed).toHaveText("0.000 s / 0");
  expect(errors).toEqual([]);
});
