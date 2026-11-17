import { expect, test, type Page } from "@playwright/test";
const final = "/projects/sph-water-gpu/13-kiem-chung-va-hoan-thien";
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "Unhandled JavaScript errors and console errors").toEqual(
    [],
  );
});
const readout = (page: Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd")
    .first();
async function ready(page: Page, url = final) {
  await page.goto(url);
  await expect(page.locator('[data-water51-ready="true"]')).toBeVisible();
}
async function details(page: Page) {
  await page.getByText("Đọc dữ liệu và phân biệt Canvas với GPU thật", { exact: true }).click();
}

test("P51 first checkpoint has a real 64-particle scene, highlighted source and no physics", async ({
  page,
}) => {
  await ready(page, "/projects/sph-water-gpu/01-khoi-hat-va-camera");
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Một bước", exact: true })).toBeDisabled();
  await expect(page.locator('.prose [data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator(".checkpoint-source")).toBeVisible();
  await details(page);
  await expect(readout(page, "Hạt nộp vẽ")).toHaveText("64");
});
test("P51 kernel plot explains spherical volume and its q control does not advance water", async ({
  page,
}) => {
  await ready(page, "/projects/sph-water-gpu/02-mo-hinh-sph-ba-chieu");
  await expect(page.getByLabel("Đồ thị cubic spline 3D", { exact: true })).toBeVisible();
  await page.getByLabel("Khoảng cách kernel q", { exact: true }).fill("1.5");
  await expect(page.getByText("Khoảng cách q = 1.50", { exact: false })).toBeVisible();
  await expect(page.getByText("Tick 0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại q", exact: true }).click();
  await expect(page.getByLabel("Khoảng cách kernel q")).toHaveValue("0.8");
});

test("P51 pre-force lessons keep play, step and physics shortcuts disabled", async ({ page }) => {
  for (const slug of ["02-mo-hinh-sph-ba-chieu", "03-ssbo-va-khoi-tao", "04-density-tren-gpu"]) {
    await ready(page, `/projects/sph-water-gpu/${slug}`);
    await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Một bước", exact: true })).toBeDisabled();
    const canvas = page.getByLabel("Bể nước SPH 3D", { exact: true });
    await canvas.press("n");
    await canvas.press("Space");
    await expect(page.getByText("Tick 0", { exact: true })).toBeVisible();
  }
});
test("P51 reduced motion, true CPU counts and complete native source stay distinct", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  const canvas = page.getByLabel("Bể nước SPH 3D", { exact: true });
  const description = await canvas.getAttribute("aria-describedby");
  expect(description).toBeTruthy();
  expect(await page.locator(`[id="${description}"]`).count()).toBe(1);
  await canvas.press("n");
  await expect(page.getByText("Tick 1", { exact: true })).toBeVisible();
  await details(page);
  await expect(readout(page, "Hạt thực sự cập nhật")).toHaveText("1728");
  await expect(readout(page, "Khối lượng nước")).toHaveText("166.375 kg");
  await expect(page.locator(".complete-project-source")).toBeVisible();
  await expect(page.getByRole("link", { name: /Tải ZIP Dự án/i }).first()).toHaveAttribute(
    "href",
    "/downloads/project-51-sph-water-gpu.zip",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy mô phỏng", exact: true }).click();
  await expect(page.getByText("Tick 1", { exact: true })).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
test("P51 orbit/zoom/resize keep positions; pointer capture releases outside Canvas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await details(page);
  const before = await readout(page, "Hạt 0 — position").textContent(),
    camera = await readout(page, "Camera yaw/pitch/distance").textContent();
  const canvas = page.getByLabel("Bể nước SPH 3D", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y - 10, { steps: 4 });
  await page.mouse.up();
  await expect(readout(page, "Camera yaw/pitch/distance")).not.toHaveText(camera!);
  await expect(readout(page, "Hạt 0 — position")).toHaveText(before!);
  await canvas.press("ArrowRight");
  await canvas.press("Home");
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(readout(page, "Hạt 0 — position")).toHaveText(before!);
  expect(errors).toEqual([]);
});
test("P51 obstacle tool changes target, not camera; reset and N changes clear state", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Số hạt Canvas", { exact: true }).selectOption("4");
  await page.getByLabel("Cảnh nước 3D", { exact: true }).selectOption("obstacle");
  await details(page);
  const camera = await readout(page, "Camera yaw/pitch/distance").textContent(),
    target = await readout(page, "Đích vật cản").textContent();
  await page.getByRole("button", { name: "Khuấy nước", exact: true }).click();
  const canvas = page.getByLabel("Bể nước SPH 3D", { exact: true });
  await canvas.press("ArrowLeft");
  await expect(readout(page, "Đích vật cản")).not.toHaveText(target!);
  await expect(readout(page, "Camera yaw/pitch/distance")).toHaveText(camera!);
  await canvas.press("n");
  await expect(page.getByText("Tick 1", { exact: true })).toBeVisible();
  await expect(readout(page, "Hạt thoát bể")).toHaveText("0");
  await page.getByRole("button", { name: "Đặt lại nước", exact: true }).click();
  await expect(page.getByText("Tick 0", { exact: true })).toBeVisible();
  await page.getByLabel("Số hạt Canvas", { exact: true }).selectOption("8");
  await expect(readout(page, "Hạt nộp vẽ")).toHaveText("512");
});
test("P51 theme/progress persist across navigation and legacy links resolve", async ({ page }) => {
  await ready(page, "/projects/sph-water-gpu/01-khoi-hat-va-camera");
  const dark = page.getByRole("button", { name: "Chuyển sang giao diện tối", exact: true });
  if (await dark.isVisible()) await dark.click();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".lesson-nav a.next").click();
  await expect(page).toHaveURL(/02-mo-hinh-sph-ba-chieu/);
  await expect(page.locator(".lesson-hero h1")).toHaveText("Đổi SPH từ diện tích sang thể tích");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await ready(page, "/projects/sph-water-gpu/12-kiem-chung-va-hoan-thien");
  await expect(page).toHaveURL(/13-kiem-chung-va-hoan-thien/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
