import { expect, test, type Page } from "@playwright/test";

const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

test("Project 08 final preserves every readout and handles presets, zero and rate-limited manual steps", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/mouse-turret/07-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Tháp pháo 2D:"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const preset = page.getByLabel("Vị trí mẫu", { exact: true });
  await preset.selectOption("0");
  await expect(read(page, "raw dot")).toHaveText("2.0000 world");
  await expect(read(page, "normalized dot")).toHaveText("1.000000");
  await preset.selectOption("1");
  await expect(read(page, "raw dot")).toHaveText("5.0000 world");
  await expect(read(page, "normalized dot")).toHaveText("1.000000");
  await preset.selectOption("5");
  await expect(read(page, "unsigned angle")).toContainText("Không xác định");
  await expect(read(page, "trong vùng nhìn")).toContainText("chưa có hướng");
  await preset.selectOption("2");
  await page.getByRole("button", { name: "Tiến 0,1 s", exact: true }).click();
  await expect(read(page, "signed error")).toHaveText("81.000°");
  await expect(read(page, "projection")).toBeVisible();
  await expect(read(page, "reconstruction error")).toBeVisible();
});

test("Project 08 actual hover and held/captured target work with world Y and keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/mouse-turret/01-bo-khung-thap-phao-va-muc-tieu");
  const canvas = page.locator('canvas[aria-label^="Tháp pháo 2D:"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing turret Canvas bounds");
  const width = Math.max(280, Math.round(box.width));
  const height = Math.max(260, Math.round(box.height));
  const scale = Math.min(width / 1100, height / 760);
  const origin = {
    x: box.x + ((width - 1100 * scale) / 2) * (box.width / width),
    y: box.y + ((height - 760 * scale) / 2) * (box.height / height),
  };
  const point = (x: number, y: number) => ({
    x: origin.x + x * scale * (box.width / width),
    y: origin.y + y * scale * (box.height / height),
  });
  const up = point(550, 210),
    left = point(350, 410);
  await page.mouse.move(up.x, up.y);
  await expect(read(page, "targetOffset")).toHaveText("(0.000, 5.000) world");
  await canvas.focus();
  await canvas.press("f");
  await expect(page.getByLabel("Theo chuột", { exact: true })).not.toBeChecked();
  await page.mouse.move(left.x, left.y);
  await expect(read(page, "targetOffset")).toHaveText("(0.000, 5.000) world");
  await page.mouse.down();
  await page.mouse.up();
  await expect(read(page, "targetOffset")).toHaveText("(-5.000, 0.000) world");
  await canvas.focus();
  await canvas.press("ArrowUp");
  await expect(read(page, "targetOffset")).toHaveText("(-5.000, 0.250) world");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});
