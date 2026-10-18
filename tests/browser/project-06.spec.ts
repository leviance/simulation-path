import { expect, test } from "@playwright/test";

const read = (page: import("@playwright/test").Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

test("Project 06 final keeps arithmetic while presets, normalization and lerp controls update", async ({
  page,
}) => {
  await page.goto("/projects/vector-playground/08-lerp-va-validation");
  await expect(read(page, "A+B")).toHaveText("(2.000, 4.000)");
  await expect(read(page, "A−B")).toHaveText("(4.000, -1.000)");
  await page.getByLabel("Lớp bổ sung", { exact: true }).selectOption("lerp");
  await page.getByLabel("Tham số t", { exact: true }).fill("0");
  await expect(read(page, "lerp(A,B,t)")).toHaveText("(3.000, 1.500) tại t=0.00");
  await expect(read(page, "A+B")).toBeVisible();
  await page.getByLabel("Trường hợp", { exact: true }).selectOption("zero");
  await page.getByLabel("Lớp bổ sung", { exact: true }).selectOption("unit");
  await expect(read(page, "Hướng của A")).toContainText("Không xác định");
  await expect(read(page, "normalize(A)")).toContainText("length=0.000000");
});

test("Project 06 actual Canvas selects B at a coincident endpoint, keyboard nudges and pause freezes input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/vector-playground/03-keo-endpoint");
  await page.getByLabel("Trường hợp", { exact: true }).selectOption("bothZero");
  await page.getByLabel("Chọn vector", { exact: true }).selectOption("1");
  const canvas = page.locator('canvas[aria-label^="Mô phỏng vector 2D"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing Canvas bounds");
  const scale = Math.min(box.width / 1100, box.height / 760);
  const x = box.x + (box.width - 1100 * scale) / 2 + 550 * scale;
  const y = box.y + (box.height - 760 * scale) / 2 + 420 * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45 * scale, y);
  await page.mouse.up();
  await expect(read(page, "A")).toContainText("(0.000, 0.000)");
  await expect(read(page, "B")).toContainText("(1.000, 0.000)");
  await canvas.focus();
  await canvas.press("ArrowUp");
  await expect(read(page, "B")).toContainText("(1.000, 0.100)");
  await canvas.press("Space");
  await canvas.press("ArrowUp");
  await expect(read(page, "B")).toContainText("(1.000, 0.100)");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read(page, "A")).toContainText("(3.000, 1.500)");
});
