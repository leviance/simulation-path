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
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
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
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
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

test("Project 11 derives perspective with a synchronized XZ/YZ section", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/perspective-point/03-perspective-divide");
  const section = page.locator(".lab-body figure");
  // SSR đã có controls; đợi effect resize Canvas xác nhận client đã hydrate.
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
  const pixel = page.locator(".lab-readout div").filter({ hasText: "pixel" }).locator("dd");
  await expect(section).toContainText("0.2500");
  await expect(pixel).toHaveText("(623.13, 356.13)");
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("1");
  await expect(section).toContainText("0.1250");
  await expect(pixel).toHaveText("(586.56, 378.06)");
  await page.getByLabel("Mặt cắt", { exact: true }).selectOption("y");
  await expect(section).toContainText("Y′ = 0.600 / 8.000 = 0.0750");
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("3");
  await expect(section).toContainText("Z không dương");
  await expect(pixel).toHaveText("Không xác định");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(pixel).toHaveText("(623.13, 356.13)");
  expect(errors).toEqual([]);
});

test("Project 11 final keeps clean depth scene and keyboard stepping", async ({ page }) => {
  await page.goto("/projects/perspective-point/08-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Điểm sáng 3D"]');
  await expect(canvas).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
    .toBeGreaterThan(300);
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("0.100 s");
  await canvas.press("n");
  await expect(page.locator(".lab-readout")).toContainText("0.200 s");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("round-trip error");
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("3");
  await expect(page.locator(".lab-readout")).toContainText("behind");
  await expect(page.getByRole("link", { name: "Tải ZIP Dự án 11 ↓", exact: true })).toHaveAttribute(
    "href",
    "/downloads/project-11-perspective-point.zip",
  );
});
