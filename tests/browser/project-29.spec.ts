import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 29 rebuilds topology, captures selection and preserves checksum", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/visible-quadtree/08-hoan-thien-visible-quadtree-va-nghiem-thu");

  const canvas = page.locator('canvas[aria-label^="Quadtree"]');
  const controls = page.locator(".lab-controls");
  const topology = page
    .locator(".lab-readout div")
    .filter({ hasText: "Tree topology / rebuild" })
    .locator("dd");
  const match = page
    .locator(".lab-readout div")
    .filter({ hasText: "Topology / brute-force oracle" })
    .locator("dd");
  const benchmark = page
    .locator(".lab-readout div")
    .filter({ hasText: "Benchmark tree / brute" })
    .locator("dd");
  const pointer = page
    .locator(".lab-readout div")
    .filter({ hasText: "Auto selection / pointer" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(topology).toContainText("depth");
  await controls.getByLabel("Leaf capacity").selectOption("32");
  await expect(topology).toContainText("max leaf");
  await controls.getByLabel("Distribution").selectOption("uniform");

  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.35);
    await page.mouse.down();
    await expect(pointer).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.6);
    await page.mouse.up();
  }
  await expect(pointer).toContainText("đã nhả");

  await page.getByRole("button", { name: "So benchmark" }).click();
  await expect(benchmark).not.toHaveText("chưa chạy");
  await expect(match).toContainText("checksum khớp");
  await page.getByRole("button", { name: "Chạy capacity study" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(benchmark).toHaveText("chưa chạy");
  expect(errors).toEqual([]);
});
