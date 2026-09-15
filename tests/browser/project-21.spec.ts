import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 21 OBJ Viewer parses editable input and preserves Z-buffer output", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/obj-mesh-viewer/08-load-file-controls-va-validation");

  const canvas = page.locator('canvas[aria-label^="OBJ mesh được parse"]');
  const controls = page.locator(".lab-controls");
  const triangles = page
    .locator(".lab-readout div")
    .filter({ hasText: "Triangle sau fan" })
    .locator("dd");
  const diagnostic = page
    .locator(".lab-readout div")
    .filter({ hasText: "Diagnostic đầu tiên" })
    .locator("dd");
  const difference = page
    .locator(".lab-readout div")
    .filter({ hasText: "Chênh lệch khi đảo order" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(diagnostic).toContainText("line 3");
  await controls.getByLabel("OBJ mẫu").selectOption("rocket");
  await expect(triangles).not.toHaveText("0");
  await expect(diagnostic).toHaveText("không có");
  await expect(difference).toHaveText("0 color · 0 depth");

  await controls.getByLabel("Back-face culling").check();
  await controls.getByLabel("Đảo draw order").check();
  await expect(difference).toHaveText("0 color · 0 depth");

  await page.getByLabel("Nguồn OBJ").fill("v 0 0 0\nf 1 0 2");
  await page.getByRole("button", { name: "Nạp source vào parser" }).click();
  await expect(diagnostic).toContainText("line 2");

  await controls.getByLabel("OBJ mẫu").selectOption("slash");
  await expect(triangles).toHaveText("2");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await canvas.hover({
      position: { x: Math.round(box.width / 2), y: Math.round(box.height / 2) },
    });
    await page.mouse.down();
    await expect(captureState).toHaveText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.58);
    await page.mouse.up();
  }
  await expect(captureState).toHaveText("đã nhả");
  await page.getByRole("button", { name: /Tạm dừng|Cho model quay/ }).click();
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  expect(errors).toEqual([]);
});
