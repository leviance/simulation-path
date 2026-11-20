import { expect, test, type Page } from "@playwright/test";
const base = "/projects/volume-slicer/";
const final = "09-kiem-chung-va-ban-hoan-chinh";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (e) => messages.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") messages.push(e.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function ready(page: Page, lesson = final) {
  await page.goto(base + lesson);
  await expect(page.locator('[data-volume53-ready="true"]')).toBeVisible({ timeout: 25000 });
}
const probe = (page: Page) => page.locator("[data-probe]").getAttribute("data-probe");

test("P53 starts with a real analytic sphere slice, highlighted code and gated future controls", async ({
  page,
}) => {
  await ready(page, "01-mo-cua-so-va-ve-lat-dau");
  await expect(page.getByLabel("Lát cắt XY", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Lát cắt XZ", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Dataset", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Trilinear", { exact: true })).toBeDisabled();
  await expect(page.locator('.prose [data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator(".checkpoint-source")).toBeVisible();
  const before = await probe(page);
  await page.getByLabel("Lát XY", { exact: true }).fill("40");
  expect(await probe(page)).not.toBe(before);
});
test("P53 inspector shows eight real weights while sampler and display keep the same probe", async ({
  page,
}) => {
  await ready(page, "04-noi-suy-tam-voxel");
  await expect(page.locator("details table tbody tr")).toHaveCount(8);
  await expect(page.getByText(/Tổng trọng số: 1\.000000000/)).toBeVisible();
  const before = await probe(page);
  await page.getByLabel("Trilinear", { exact: true }).uncheck();
  expect(await probe(page)).toBe(before);
  await page.getByLabel("Lát XZ", { exact: true }).fill("20");
  expect((await probe(page))!.split(",")[1]).toBe("20");
});
test("P53 final uses 128^3 actual samples, finite audit and a currently painted context", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByLabel("Độ phân giải volume")).toHaveValue("128");
  await expect(page.locator("[data-dataset]")).toHaveAttribute("data-dataset", "specimen");
  await expect(
    page.locator("[data-volume53-ready]").getByText(/128³ = 2\.097\.152 mẫu/),
  ).toBeVisible();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await expect(page.locator("[data-volume53-ready] figcaption strong").first()).toHaveCSS(
    "color",
    "rgb(230, 227, 212)",
  );
  await page.locator("[data-volume53-ready]").screenshot({
    path: ".validation/p53-workbench-web.png",
    // The full lab is taller than a viewport; omit the site's sticky navigation
    // from this evidence image without changing the page or application CSS.
    style: ".site-header { visibility: hidden !important; }",
  });
  await page.getByRole("button", { name: "Kiểm volume và nội suy", exact: true }).click();
  await expect(page.getByText(/PASS — 13 checks/)).toBeVisible();
  await expect(page.locator(".complete-project-source")).toBeVisible();
  const download = page.getByRole("link", { name: /Tải ZIP Dự án/i }).first();
  await expect(download).toHaveAttribute("href", "/downloads/project-53-volume-slicer.zip");
  const response = await page.request.get("/downloads/project-53-volume-slicer.zip", {
    timeout: 15000,
  });
  expect(response.ok()).toBeTruthy();
  const bytes = await response.body();
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
});
test("P53 camera, image picks and letterbox retain their distinct meanings", async ({ page }) => {
  await ready(page);
  const before = await probe(page),
    scene = page.getByLabel("Khối mẫu cắt mở 3D", { exact: true });
  await scene.scrollIntoViewIfNeeded();
  const box = (await scene.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y - 8, { steps: 3 });
  await page.mouse.up();
  expect(await probe(page)).toBe(before);
  await scene.press("Home");
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  expect(await probe(page)).toBe(before);
  const xy = page.getByLabel("Lát cắt XY", { exact: true });
  await xy.scrollIntoViewIfNeeded();
  const image = (await xy.boundingBox())!;
  await page.mouse.click(image.x + 1, image.y + image.height / 2);
  expect(await probe(page)).toBe(before);
  await page.mouse.click(image.x + image.width / 2, image.y + image.height / 2);
  const after = (await probe(page))!.split(",").map(Number);
  expect(Math.abs(after[0])).toBeLessThan(2);
  expect(Math.abs(after[1])).toBeLessThan(2);
  expect(after[2]).toBe(-8);
  await xy.press("PageUp");
  expect(Number((await probe(page))!.split(",")[2])).toBeCloseTo(-6.25);
});
test("P53 cancelled dataset jobs cannot overwrite the latest selection", async ({ page }) => {
  await ready(page, "06-dat-lat-cat-trong-khoi-3d");
  await page.getByLabel("Độ phân giải volume").selectOption("128");
  await page.getByLabel("Dataset", { exact: true }).selectOption("gaussian");
  await page.getByLabel("Dataset", { exact: true }).selectOption("layers");
  await expect(page.locator('[data-volume53-ready="true"]')).toBeVisible({ timeout: 25000 });
  await expect(page.locator("[data-dataset]")).toHaveAttribute("data-dataset", "layers");
  await expect(
    page.locator("[data-volume53-ready]").getByText(/128³ = 2\.097\.152 mẫu/),
  ).toBeVisible();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible();
  await page.getByLabel("Level", { exact: true }).fill("0.3");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue("layers");
  await expect(page.getByLabel("Độ phân giải volume")).toHaveValue("128");
});
test("P53 reduced motion, end-of-scan and blur stop automatic motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Lát XY", { exact: true }).fill("111.9");
  await page.getByRole("button", { name: "Quét lát", exact: true }).click();
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeVisible();
  expect(Number((await probe(page))!.split(",")[2])).toBe(112);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByRole("button", { name: "Quét lát", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeVisible();
});
test("P53 DPR/resize, theme/progress and old URLs remain usable", async ({ browser }) => {
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage(),
    messages: string[] = [];
  page.on("pageerror", (error) => messages.push(error.message));
  await ready(page, "01-mo-cua-so-va-ve-lat-dau");
  const bitmap = await page.getByLabel("Lát cắt XY", { exact: true }).evaluate((canvas) => ({
    width: (canvas as HTMLCanvasElement).width,
    css: canvas.getBoundingClientRect().width,
  }));
  expect(bitmap.width).toBeCloseTo(bitmap.css * 2, -1);
  const dark = page.getByRole("button", { name: "Chuyển sang giao diện tối", exact: true });
  if (await dark.isVisible()) await dark.click();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("[data-volume53-ready] figcaption strong").first()).toHaveCSS(
    "color",
    "rgb(230, 227, 212)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
  ).toBeTruthy();
  await page.goto(base + "05-noi-suy-giua-cac-lat");
  await expect(page).toHaveURL(/04-noi-suy-tam-voxel/);
  expect(messages).toEqual([]);
  await context.close();
});
