import { expect, test, type Locator, type Page } from "@playwright/test";
import project from "../../course/projects/p46/manifest";

const overview = "/projects/falling-sand";
const progressKey = "simulation-path-progress-v2";
const row = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

test.use({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1.5,
  contextOptions: { reducedMotion: "reduce" },
});

async function open(page: Page, order = 9) {
  await page.goto(`${overview}/${project.lessons[order - 1].slug}`);
  await expect(page.locator(".lesson-hero h1")).toHaveText(project.lessons[order - 1].title);
  const canvas = page.getByLabel("Hộp cát ô lưới", { exact: true });
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext("2d");
        return context?.getImageData(0, 0, 1, 1).data[3] ?? 0;
      }),
    )
    .toBe(255);
  return canvas;
}

async function point(canvas: Locator, x: number, y: number) {
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Missing Canvas bounds");
  const scale = Math.min((bounds.width - 32) / 512, (bounds.height - 32) / 320);
  return {
    x: bounds.x + (bounds.width - 512 * scale) / 2 + (x + 0.5) * scale,
    y: bounds.y + (bounds.height - 320 * scale) / 2 + (y + 0.5) * scale,
  };
}

test("all nine sand modes expose only the operations being taught and render the real grid", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (let order = 1; order <= 9; order += 1) {
    const canvas = await open(page, order);
    await expect(row(page, "Lưới")).toHaveText(
      order < 7 ? "96 × 64 · 6144 ô" : "512 × 320 · 163840 ô",
    );
    await expect(page.getByLabel("Vật liệu", { exact: true })).toHaveCount(order >= 2 ? 1 : 0);
    await expect(page.getByLabel("Tốc độ mô phỏng", { exact: true })).toHaveCount(
      order >= 6 ? 1 : 0,
    );
    await expect(page.getByLabel("Thứ tự quét", { exact: true })).toHaveCount(order >= 8 ? 1 : 0);
    await expect(page.getByRole("button", { name: "Kiểm các ca nhỏ", exact: true })).toHaveCount(
      order >= 9 ? 1 : 0,
    );
    if (order < 3)
      await expect(page.getByRole("button", { name: "Tiến một tick", exact: true })).toBeDisabled();
    else
      await expect(page.getByRole("button", { name: "Tiến một tick", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          const context = canvas.getContext("2d");
          if (!context || canvas.width === 0) return 0;
          const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let visible = 0;
          for (let i = 0; i < bytes.length; i += 16)
            if (bytes[i] > 60 || bytes[i + 1] > 60 || bytes[i + 2] > 60) visible += 1;
          return visible;
        }),
      )
      .toBeGreaterThan(100);
  }
  expect(errors).toEqual([]);
});

test("sand keyboard, brush interpolation, pointer capture, reset and validation act on one model", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await open(page);
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("4");
  await page.getByRole("slider", { name: /Bán kính bút/ }).press("Home");
  await canvas.focus();
  await canvas.press("Enter");
  await expect(row(page, "Số ô cát / nước")).toHaveText("1 / 0");
  await page.getByRole("button", { name: "Tiến một tick", exact: true }).click();
  await expect(row(page, "Tick")).toHaveText("1");
  await expect(row(page, "Ô đã xét / swap")).toHaveText("163840 / 1");
  const before = await row(page, "Checksum vật liệu").textContent();
  await page.getByRole("button", { name: "Kiểm các ca nhỏ", exact: true }).click();
  await expect(row(page, "Fixture chuẩn riêng")).toContainText("PASS");
  await expect(row(page, "Tick")).toHaveText("1");
  await expect(row(page, "Checksum vật liệu")).toHaveText(before!);
  await page.getByRole("button", { name: "Xóa lưới", exact: true }).click();
  const from = await point(canvas, 40, 80),
    to = await point(canvas, 80, 80);
  await canvas.evaluate((element) => {
    element.addEventListener("gotpointercapture", () =>
      element.setAttribute("data-test-capture", "yes"),
    );
  });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-test-capture", "yes");
  await page.mouse.move(to.x, to.y, { steps: 1 });
  await page.mouse.up();
  await expect(row(page, "Số ô cát / nước")).toHaveText("41 / 0");
  await page.mouse.click(from.x, from.y, { button: "right" });
  await expect(row(page, "Số ô cát / nước")).toHaveText("40 / 0");
  await page.setViewportSize({ width: 1180, height: 900 });
  await expect(row(page, "Số ô cát / nước")).toHaveText("40 / 0");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(row(page, "Tick")).toHaveText("0");
  await expect(row(page, "Số ô cát / nước")).toHaveText("0 / 0");
  expect(errors).toEqual([]);
});

test("sand presets, seed validation, order, speed and reduced motion preserve the last valid scene", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("3");
  const checksum = await row(page, "Checksum vật liệu").textContent();
  await page.getByLabel("Seed cảnh", { exact: true }).fill("4294967296");
  await page.getByRole("button", { name: "Áp dụng seed", exact: true }).click();
  await expect(page.getByLabel("Seed cảnh", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(row(page, "Checksum vật liệu")).toHaveText(checksum!);
  await page.getByLabel("Seed cảnh", { exact: true }).fill("47");
  await page.getByRole("button", { name: "Áp dụng seed", exact: true }).click();
  await expect(row(page, "Seed đang áp dụng")).toContainText("47");
  await expect(row(page, "Checksum vật liệu")).not.toHaveText(checksum!);
  await page.getByLabel("Thứ tự quét", { exact: true }).selectOption("3");
  await expect(row(page, "Thứ tự đang áp dụng")).toContainText("Từ trên xuống");
  await page.getByLabel("Tốc độ mô phỏng", { exact: true }).selectOption("2");
  await page.getByLabel("FPS hiển thị tối đa", { exact: true }).selectOption("15");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(row(page, "Tick")).not.toHaveText("0");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  const paused = await row(page, "Tick").textContent();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(200);
  await expect(row(page, "Tick")).toHaveText(paused!);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(row(page, "Tick")).toHaveText("0");
  await expect(row(page, "Trạng thái")).toHaveText("Đang dừng");
});

test("sand legacy lesson URL, progress migration and dark navigation retain the correct edition", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem("simulation-path-theme", "dark");
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          completedLessonIds: ["p45-l01", "p46-l07", "p47-l01"],
          projectContentVersions: { p45: 2 },
        }),
      );
  }, progressKey);
  await page.goto(`${overview}/07-kiem-chung-va-hoan-thien`);
  await expect(page).toHaveURL(`${overview}/09-kiem-chung-va-hoan-thien`);
  await expect(page.locator(".lesson-hero h1")).toHaveText(project.lessons[8].title);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).completedLessonIds,
        progressKey,
      ),
    )
    .toEqual(["p45-l01", "p47-l01"]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".lesson-nav a").first().click();
  await expect(page.locator(".lesson-hero h1")).toHaveText(project.lessons[7].title);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.locator('a[href="/downloads/project-46-falling-sand.zip"]').first(),
  ).toBeAttached();
});

test("sand final exposes complete source, copies CMake and serves the actual ZIP without download tracking", async ({
  page,
  context,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/project-sources/")) requested.push(request.url());
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await expect(page.locator("#ma-hoan-chinh-cua-project")).toHaveText("Toàn bộ mã nguồn của dự án");
  const cmake = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^CMakeLists\.txt$/ }) });
  await expect(cmake).toHaveAttribute("data-ready", "true");
  await cmake.locator("summary").click();
  await expect(cmake.locator("pre code")).toContainText("cmake_minimum_required(VERSION 3.24)");
  const copy = cmake.getByRole("button", { name: "Sao chép đoạn code", exact: true });
  await copy.click();
  await expect(copy).toHaveText("ĐÃ CHÉP");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("SDL3::SDL3");
  const main = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^src\/main\.cpp$/ }) });
  await expect(main).toHaveAttribute("data-ready", "true");
  await main.locator("summary").click();
  await expect(main.locator("pre code")).toContainText("sand::drawTexture");
  const link = page.locator('a[href="/downloads/project-46-falling-sand.zip"]').first();
  await expect(link).toBeAttached();
  const response = await context.request.get((await link.getAttribute("href"))!, { timeout: 5000 });
  expect(response.status()).toBe(200);
  const bytes = await response.body();
  expect(bytes.subarray(0, 2).toString("ascii")).toBe("PK");
  expect(requested.length).toBeGreaterThanOrEqual(2);
  expect(requested.every((url) => new URL(url).pathname.startsWith("/project-sources/46/"))).toBe(
    true,
  );
});
