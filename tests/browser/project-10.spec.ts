import { expect, test, type Page } from "@playwright/test";
const route = "/projects/3d-compass/07-suy-bien-va-kiem-chung";
const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
test("P10 final shows numeric 3-4 normal, winding and undefined near-collinear facing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="La bàn ba trục perspective"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const preset = page.getByLabel("Tam giác mẫu", { exact: true });
  await preset.selectOption("1");
  await expect(read(page, "raw cross")).toHaveText("(0.0000, 0.0000, 12.0000)");
  await expect(read(page, "area")).toHaveText("6.00000e+0 world²");
  await page.getByRole("button", { name: "Đảo winding", exact: true }).click();
  await expect(read(page, "raw cross")).toHaveText("(0.0000, 0.0000, -12.0000)");
  await expect(read(page, "area")).toHaveText("6.00000e+0 world²");
  await preset.selectOption("4");
  await expect(read(page, "unit normal")).toHaveText("Không xác định");
  await expect(read(page, "facing")).toHaveText("Không xác định");
  await expect(read(page, "area")).toHaveText("5.00000e-8 world²");
  await expect(page.getByRole("button", { name: "Chạy orbit", exact: true })).toBeDisabled();
});
test("P10 actual orbit is relative, preserves geometry and keyboard Z/Tab stay usable", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="La bàn ba trục perspective"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await canvas.scrollIntoViewIfNeeded();
  const eye = await read(page, "camera eye").textContent(),
    a = await read(page, "vector A").textContent(),
    b = await read(page, "vector B").textContent();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No compass canvas");
  const width = Math.max(280, Math.round(box.width)),
    height = Math.max(260, Math.round(box.height)),
    scale = Math.min(width / 1100, height / 800);
  const point = (x: number, y: number) => ({
    x: box.x + (((width - 1100 * scale) / 2 + x * scale) * box.width) / width,
    y: box.y + (((height - 800 * scale) / 2 + y * scale) * box.height) / height,
  });
  const start = point(500, 400),
    end = point(550, 450);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(read(page, "camera eye")).toHaveText(eye!);
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect(read(page, "camera eye")).not.toHaveText(eye!);
  await expect(read(page, "vector A")).toHaveText(a!);
  await expect(read(page, "vector B")).toHaveText(b!);
  await canvas.focus();
  await canvas.press("PageUp");
  await expect(read(page, "vector B")).toContainText("1.1000");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});

test("P10 Pause survives internal focus transfer, complete source and progress reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="La bàn ba trục perspective"]');
  await expect(page.getByLabel("Tam giác mẫu", { exact: true })).toBeEnabled();
  await canvas.focus();
  await canvas.press("Space");
  const pause = page.getByRole("button", { name: "Tạm dừng", exact: true });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(page.getByRole("button", { name: "Chạy orbit", exact: true })).toBeVisible();
  const eye = await read(page, "camera eye").innerText();
  await expect
    .poll(async () => {
      await page.waitForTimeout(200);
      return read(page, "camera eye").innerText();
    })
    .toBe(eye);
  const source = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code").filter({ hasText: "include/lab.hpp" }) })
    .first();
  await source.locator("summary").click();
  await expect(source.locator(".highlighted-code")).toContainText("triangleUnitNormal");
  await expect(
    page.locator("a[href='/downloads/project-10-3d-compass.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
