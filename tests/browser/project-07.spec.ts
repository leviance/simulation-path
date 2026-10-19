import { expect, test, type Page } from "@playwright/test";

const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

test("Project 07 final keeps all controls and samples six timestamps per manual step", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/unit-circle/07-hoan-thien-va-kiem-chung");
  await page.getByLabel("Mốc góc", { exact: true }).selectOption(String(2 * Math.PI));
  await expect(read(page, "angle")).toContainText("0.00000 rad");
  await expect(read(page, "history")).toContainText("1/361 mẫu");
  await page.getByRole("button", { name: "Tiến 0,1 s", exact: true }).click();
  await expect(read(page, "angle")).toContainText("0.15708 rad");
  await expect(read(page, "history")).toContainText("7/361 mẫu");
  await page.getByLabel("Vận tốc góc", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Tiến 0,1 s", exact: true }).click();
  await expect(read(page, "angle")).toContainText("0.15708 rad");
  await expect(read(page, "period")).toContainText("đứng yên");
  await expect(read(page, "history")).toContainText("13/361 mẫu");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read(page, "angle")).toContainText("0.61087 rad");
});

test("Project 07 actual Canvas drag uses world Y, ignores center, and keeps Tab available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/unit-circle/06-keo-kim-voi-atan2");
  await page.getByLabel("Mốc góc", { exact: true }).selectOption("0");
  const canvas = page.locator('canvas[aria-label^="Đường tròn đơn vị:"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing unit circle Canvas bounds");
  const scale = Math.min(box.width / 1100, box.height / 760);
  const origin = {
    x: box.x + (box.width - 1100 * scale) / 2,
    y: box.y + (box.height - 760 * scale) / 2,
  };
  const position = (x: number, y: number) => ({ x: origin.x + x * scale, y: origin.y + y * scale });
  const start = position(460, 390),
    up = position(275, 205),
    center = position(275, 390);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(up.x, up.y);
  await expect(read(page, "angle")).toContainText("1.57080 rad");
  await page.mouse.move(center.x, center.y);
  await expect(read(page, "angle")).toContainText("1.57080 rad");
  await page.mouse.move(up.x, up.y);
  await page.mouse.up();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(read(page, "angle")).toContainText("1.65806 rad");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await expect(read(page, "history")).toBeVisible();
});
