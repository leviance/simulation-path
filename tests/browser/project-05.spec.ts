import { expect, test } from "@playwright/test";

const read = (page: import("@playwright/test").Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");

test("Project 05 places, selects, nudges, deletes points and respects pause on the real Canvas", async ({
  page,
}) => {
  await page.goto("/projects/coordinate-map/06-dat-va-keo-diem");
  const canvas = page.locator('canvas[aria-label^="Mặt phẳng tọa độ"]');
  await expect(canvas).toBeVisible();
  await expect(read(page, "Số điểm")).toHaveText("1/256");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas has no bounds");
  await page.mouse.click(box.x + 90, box.y + 160);
  await expect(read(page, "Số điểm")).toHaveText("2/256");
  await page.getByLabel("Chọn điểm", { exact: true }).selectOption("1");
  await canvas.focus();
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("Delete");
  await expect(read(page, "Số điểm")).toHaveText("2/256");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await canvas.focus();
  await canvas.press("Delete");
  await expect(read(page, "Số điểm")).toHaveText("1/256");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read(page, "Camera")).toContainText("55.0 px/unit");
});

test("Project 05 pan and zoom preserve anchor and keyboard Tab can leave Canvas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/coordinate-map/05-zoom-quanh-cursor");
  const canvas = page.locator('canvas[aria-label^="Mặt phẳng tọa độ"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas has no bounds");
  const x = box.x + 120,
    y = box.y + 140;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 55, y + 27.5);
  await page.mouse.up({ button: "right" });
  await expect(read(page, "Camera")).not.toContainText("(0.00, 0.00)");
  const world = await read(page, "World").textContent();
  await page.mouse.wheel(0, -120);
  await expect(read(page, "World")).toHaveText(world || "");
  await canvas.focus();
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Tạm dừng", exact: true })).toBeVisible();
});
