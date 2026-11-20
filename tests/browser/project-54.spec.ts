import { expect, test, type Page } from "@playwright/test";

const base = "/projects/volume-ray-marching/";
const final = "10-kiem-chung-va-hoan-thien";
const errors = new WeakMap<Page, string[]>();
const lab = (page: Page) => page.locator("[data-v54-ready]");
const canvas = (page: Page) => page.getByLabel("Volume Lightbox", { exact: true });
const camera = (page: Page) => page.locator("[data-ray]").getAttribute("data-camera");

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function ready(page: Page, lesson = final) {
  await page.goto(base + lesson);
  await expect(lab(page)).toHaveAttribute("data-v54-ready", "true", { timeout: 20000 });
  await expect(canvas(page)).toHaveAttribute("data-ready", "true", { timeout: 20000 });
}

test("P54 starts with UV, gates future algorithms and provides highlighted runnable source", async ({
  page,
}) => {
  await ready(page, "01-cua-so-va-fullscreen-triangle");
  await expect(lab(page)).toHaveAttribute("data-voxels", "0");
  await expect(page.getByLabel("Dataset", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "MIP", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Xoay trái", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tiến một mẫu", exact: true })).toHaveCount(0);
  await expect(page.locator('.prose [data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator(".checkpoint-source")).toBeVisible();
  await expect(
    page.getByText("Ảnh UV đầu tiên; chưa có ray hoặc volume.", { exact: true }),
  ).toBeVisible();
});

test("P54 final allocates 128^3 real samples, paints the current image and validates 38 fixtures", async ({
  page,
}) => {
  await ready(page);
  await expect(lab(page)).toHaveAttribute("data-side", "128");
  await expect(lab(page)).toHaveAttribute("data-voxels", "2097152");
  await expect(lab(page)).toHaveAttribute("data-bytes", "8388608");
  await expect(lab(page)).toHaveAttribute("data-dataset", "cloud");
  // Shared lab CSS must not shrink this project's metadata to the old 9px style.
  await expect(lab(page).locator("header").first().locator("span").first()).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(page.getByRole("img", { name: "Histogram mật độ", exact: true })).toBeVisible();
  await lab(page).screenshot({
    path: ".validation/p54-workbench-web.png",
    style: ".site-header { visibility: hidden !important; }",
  });
  await page.getByRole("button", { name: "Kiểm fixture hằng và slab", exact: true }).click();
  await expect(lab(page).getByRole("status").filter({ hasText: "PASS — 38 checks" })).toBeVisible();
  await expect(page.locator(".complete-project-source")).toBeVisible();
  const link = page.getByRole("link", { name: /Tải ZIP Dự án/i }).first();
  await expect(link).toHaveAttribute("href", "/downloads/project-54-volume-ray-marching.zip");
  const response = await page.request.get("/downloads/project-54-volume-ray-marching.zip", {
    timeout: 15000,
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.body()).subarray(0, 2).toString()).toBe("PK");
});

test("P54 cloud meaning and three comparison views remain linked to actual current data", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator('[data-density="Lõi tháp mây gần"]')).toHaveText("0.741");
  await expect(page.locator('[data-density="Mép tán mây cuối gió"]')).toHaveText("0.104");
  await expect(page.locator('[data-density="Khoảng trống giữa hai lớp"]')).toHaveText("0.000");
  const comparison = page.getByRole("region", {
    name: "So sánh ba cách nhìn cùng dữ liệu",
    exact: true,
  });
  await expect(comparison).toHaveAttribute("data-comparison-ready", "true", { timeout: 20000 });
  await expect(comparison.locator('canvas[data-ready="true"]')).toHaveCount(3);
  await comparison.getByRole("button", { name: /^MIP:/ }).click();
  await expect(lab(page)).toHaveAttribute("data-mode", "mip");
  await page.getByRole("button", { name: "Xoay phải", exact: true }).click();
  await expect(comparison).toHaveAttribute("data-comparison-ready", "true", { timeout: 20000 });
  const switchStarted = Date.now();
  await page.getByLabel("Dataset", { exact: true }).selectOption("constant");
  await expect(lab(page)).toHaveAttribute("data-dataset", "constant", { timeout: 20000 });
  const switchMs = Date.now() - switchStarted;
  console.log(
    "P54 constant dataset switch ms:",
    switchMs,
    "generation ms:",
    await lab(page).getAttribute("data-generation-ms"),
  );
  expect(switchMs).toBeLessThan(5000);
  await expect(page.locator("[data-cloud-landmarks]")).toHaveCount(0);
  await expect(comparison).toHaveAttribute("data-comparison-ready", "true", { timeout: 20000 });
});

test("P54 constant medium has independent MIP, average and alpha answers with ds-correct opacity", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Dataset", { exact: true }).selectOption("constant");
  await expect(lab(page)).toHaveAttribute("data-dataset", "constant");
  await page.getByRole("button", { name: "Nhìn theo trục Z", exact: true }).click();
  await page.getByLabel("Sigma", { exact: true }).fill("2");
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: T=0.3678794");
  for (const step of ["0.008", "0.04", "0.13", "0.16"]) {
    await page.getByLabel("Step length", { exact: true }).selectOption(step);
    await expect(page.locator("[data-result]")).toHaveText("CPU reference: T=0.3678794");
  }
  await page.getByLabel("Palette", { exact: true }).selectOption("1");
  await page.getByLabel("Gradient lighting", { exact: true }).uncheck();
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: T=0.3678794");
  await page.getByRole("button", { name: "MIP", exact: true }).click();
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: MIP=0.2500000");
  await expect(page.getByLabel("Gradient lighting", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Average", exact: true }).click();
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: Mean=0.2500000");
  await page.getByRole("button", { name: "Alpha", exact: true }).click();
  await page.getByLabel("Cutoff", { exact: true }).fill("0.1");
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: T=0.5134171");
});

test("P54 orbit and ray pick are distinct, pointer capture releases, inside starts at zero and reset keeps the dataset", async ({
  page,
}) => {
  await ready(page);
  await canvas(page).scrollIntoViewIfNeeded();
  const image = (await canvas(page).boundingBox())!;
  const before = await camera(page);
  const u = await page.getByLabel("Điểm tia u", { exact: true }).inputValue();
  await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);
  await page.mouse.down();
  await page.mouse.move(image.x + image.width * 0.65, image.y - 5, { steps: 3 });
  await page.mouse.up();
  expect(await camera(page)).not.toBe(before);
  await expect(page.getByLabel("Điểm tia u", { exact: true })).toHaveValue(u);
  const after = await camera(page);
  await page.mouse.move(image.x + image.width * 0.4, image.y + image.height / 2);
  expect(await camera(page)).toBe(after);
  await page.keyboard.down("Shift");
  await page.mouse.click(image.x + image.width * 0.6, image.y + image.height * 0.45);
  await page.keyboard.up("Shift");
  expect(Number(await page.getByLabel("Điểm tia u", { exact: true }).inputValue())).toBeCloseTo(
    0.6,
    1,
  );
  expect(await camera(page)).toBe(after);
  await page.getByLabel("Camera trong volume", { exact: true }).check();
  await expect(page.locator("[data-interval]")).toContainText("0.000000 /");
  await canvas(page).press("ArrowLeft");
  await expect(page.locator("[data-ray]")).not.toHaveAttribute("data-camera", after!);
  await page.getByLabel("Dataset", { exact: true }).selectOption("cores");
  await expect(lab(page)).toHaveAttribute("data-dataset", "cores");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue("cores");
  await expect(page.getByLabel("Độ phân giải volume", { exact: true })).toHaveValue("128");
  await expect(page.getByLabel("Camera trong volume", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Điểm tia u", { exact: true })).toHaveValue("0.5");
});

test("P54 dataset jobs commit only the latest complete selection", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Dataset", { exact: true }).selectOption("cores");
  await page.getByLabel("Độ phân giải volume", { exact: true }).selectOption("64");
  await page.getByLabel("Dataset", { exact: true }).selectOption("ramp");
  await page.getByLabel("Dataset", { exact: true }).selectOption("empty");
  await page.getByLabel("Độ phân giải volume", { exact: true }).selectOption("128");
  await expect(lab(page)).toHaveAttribute("data-v54-ready", "true");
  await expect(lab(page)).toHaveAttribute("data-dataset", "empty");
  await expect(lab(page)).toHaveAttribute("data-side", "128");
  await expect(canvas(page)).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(page.locator("[data-result]")).toHaveText("CPU reference: T=1.0000000");
});

test("P54 stepping stops at the end and reduced motion or blur never silently resumes it", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Step length", { exact: true }).selectOption("0.16");
  const count = page.locator("[data-trace-count]");
  await page.getByRole("button", { name: "Tiến một mẫu", exact: true }).click();
  await expect(count).toContainText("1 /");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy mẫu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng mẫu", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy mẫu", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const stopped = await count.textContent();
  await page.waitForTimeout(200);
  await expect(count).toHaveText(stopped!);
  await page.getByRole("button", { name: "Chạy mẫu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy mẫu", exact: true })).toBeVisible({
    timeout: 4000,
  });
  const text = (await count.textContent())!;
  const [shown, total] = text
    .match(/(\d+) \/ (\d+) mẫu/)!
    .slice(1)
    .map(Number);
  expect(shown).toBe(total);
  await page.getByRole("button", { name: "Chạy mẫu", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(count).toContainText("0 /");
  await expect(page.getByRole("button", { name: "Chạy mẫu", exact: true })).toBeVisible();
});

test("P54 four-step measurements are finite CPU evidence and changes invalidate old results", async ({
  page,
}) => {
  await ready(page);
  const comparison = lab(page)
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Bước nhỏ hơn đổi được điều gì?", exact: true }),
    });
  await page.getByRole("button", { name: "So sánh bốn step (CPU)", exact: true }).click();
  await expect(comparison.locator("tbody tr")).toHaveCount(4);
  expect(await comparison.locator("tbody").textContent()).not.toMatch(/NaN|Infinity/);
  await expect(comparison).toContainText("không phải GPU hay FPS C++");
  await page.getByLabel("Sigma", { exact: true }).fill("5");
  await expect(comparison.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "So sánh bốn step (CPU)", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(comparison.locator("tbody tr")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "So sánh bốn step (CPU)", exact: true }),
  ).toBeVisible();
});

test.describe("P54 high-DPI responsive preview", () => {
  test.use({ deviceScaleFactor: 2 });
  test("DPR, mobile width and legacy links retain a usable preview", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    const dimensions = await canvas(page).evaluate((element: HTMLCanvasElement) => ({
      width: element.width,
      css: element.getBoundingClientRect().width,
      dpr: window.devicePixelRatio,
    }));
    expect(dimensions.dpr).toBe(2);
    expect(Math.abs(dimensions.width - dimensions.css * 2)).toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.getByRole("button", { name: "MIP", exact: true }).click();
    await expect(lab(page)).toHaveAttribute("data-mode", "mip");
    await page.goto(base + "01-fullscreen-fragment");
    await expect(page).toHaveURL(new RegExp(base + "01-cua-so-va-fullscreen-triangle"));
  });
});
