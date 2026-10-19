import { expect, test, type Page } from "@playwright/test";
const route = "/projects/perspective-point/08-hoan-thien-va-kiem-chung";
const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
test("P11 reduced motion, invalid depth and debug toggle expose honest readouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const preset = page.getByLabel("Điểm mẫu", { exact: true });
  await preset.selectOption("3");
  await expect(read(page, "pixel")).toHaveText("Không xác định");
  await expect(read(page, "round-trip error")).toHaveText("Không xác định");
  await preset.selectOption("0");
  await expect(read(page, "trạng thái")).toHaveText("visible");
  await expect(page.getByRole("button", { name: "Cho điểm bay", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect(read(page, "elapsed")).toHaveText("0.100 s");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(read(page, "elapsed")).toHaveText("0.100 s");
});
test("P11 actual marker drag holds offset/depth and final pointer sample; Tab exits canvas", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="Điểm sáng 3D"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No projection canvas");
  const text = await read(page, "pixel").textContent(),
    coords = text!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const width = Math.max(280, Math.round(box.width)),
    height = Math.max(260, Math.round(box.height)),
    scale = Math.min(width / 1100, height / 800);
  const pointer = (x: number, y: number) => ({
    x: box.x + (((width - 1100 * scale) / 2 + x * scale) * box.width) / width,
    y: box.y + (((height - 800 * scale) / 2 + y * scale) * box.height) / height,
  });
  const start = pointer(coords[0] + 10, coords[1]),
    end = pointer(coords[0] + 60, coords[1] + 20),
    before = await read(page, "world point").textContent();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(read(page, "world point")).toHaveText(before!);
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect(read(page, "world point")).not.toHaveText(before!);
  await expect(read(page, "world point")).toContainText("4.0000");
  await canvas.focus();
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});
