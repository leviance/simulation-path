import { expect, test, type Page } from "@playwright/test";
const route = "/projects/square-transformer/08-hoan-thien-va-kiem-chung";
const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

test("Project 09 final shows identity, reflection, singular and noncommuting order with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="Hình vuông và hệ cơ sở"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const preset = page.getByLabel("Preset biến đổi", { exact: true });
  await preset.selectOption("0");
  await expect(read(page, "world P2")).toHaveText("(1.0000, 1.0000)");
  await preset.selectOption("1");
  await expect(read(page, "determinant")).toContainText("đảo chiều");
  await preset.selectOption("2");
  await expect(read(page, "determinant")).toContainText("suy biến");
  await expect(read(page, "area ratio")).toContainText("0.000000");
  await preset.selectOption("3");
  await expect(read(page, "area ratio")).toContainText("0.000000");
  await preset.selectOption("4");
  const before = await read(page, "world P2").textContent();
  await page.getByLabel("Thứ tự", { exact: true }).selectOption("rotate-shear-scale");
  await expect(read(page, "world P2")).not.toHaveText(before!);
  await expect(page.getByRole("button", { name: "Chạy tự động", exact: true })).toBeDisabled();
  await expect(read(page, "direct vs matrix")).toBeVisible();
});

test("Project 09 actual pointer grab is relative and keyboard/Tab stay accessible", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="Hình vuông và hệ cơ sở"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await page.getByRole("button", { name: "Đặt lại identity", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No Canvas");
  const width = Math.max(280, Math.round(box.width)),
    height = Math.max(260, Math.round(box.height)),
    scale = Math.min(width / 900, height / 800);
  const point = (x: number, y: number) => ({
    x: box.x + (((width - 900 * scale) / 2 + x * scale) * box.width) / width,
    y: box.y + (((height - 800 * scale) / 2 + y * scale) * box.height) / height,
  });
  const start = point(500, 400),
    end = point(550, 350);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(read(page, "world P2")).toHaveText("(1.0000, 1.0000)");
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect(read(page, "world P2")).toHaveText("(2.0000, 2.0000)");
  await canvas.focus();
  await canvas.press("ArrowUp");
  await expect(read(page, "world P2")).toHaveText("(2.0000, 2.1000)");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByLabel("Dịch chuyển X", { exact: true }).focus();
  await page.getByLabel("Dịch chuyển X", { exact: true }).press("ArrowLeft");
  await expect(read(page, "world P2")).toHaveText("(1.9000, 2.1000)");
});
