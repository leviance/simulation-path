import { expect, test, type Page } from "@playwright/test";
import project from "../../course/projects/p48/manifest";
const final = "/projects/wind-map/09-kiem-chung-va-hoan-thien";
const value = (page: Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
async function open(page: Page, route = final) {
  await page.goto(route);
  await expect(page.locator('[data-wind-ready="true"]')).toBeVisible();
}

test("wind known presets, exact readouts and progressive controls use the numerical field", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, "/projects/wind-map/01-ve-luoi-mui-ten");
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Trường mẫu", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Lớp màu", exact: true })).toHaveCount(0);
  await open(page);
  await expect(value(page, "Lưới / dx / dy")).toContainText("65 × 49");
  await expect(value(page, "Mẫu trường / glyph hiển thị")).toHaveText("3185 / 221");
  await page.getByRole("combobox", { name: "Trường mẫu", exact: true }).selectOption("uniform");
  await page.getByRole("combobox", { name: "Lớp màu", exact: true }).selectOption("curl");
  await page.getByLabel("Hạt đánh dấu", { exact: true }).uncheck();
  const canvas = page.getByLabel("Bản đồ trường vector", { exact: true });
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const bounds = canvas.getBoundingClientRect();
        const width = Math.max(280, Math.round(bounds.width));
        const height = Math.max(260, Math.round(bounds.height));
        const scale = Math.min((width - 32) / 4, (height - 32) / 3);
        const left = (width - 4 * scale) / 2,
          top = (height - 3 * scale) / 2;
        const dpr = canvas.width / width;
        const ctx = canvas.getContext("2d")!;
        return [26.5, 40.5, 50.5].flatMap((column) => {
          const x = Math.round((left + (column / 64) * 4 * scale) * dpr);
          const y = Math.round((top + (3 - (10.5 / 48) * 3) * scale) * dpr);
          return Array.from(ctx.getImageData(x - 1, y, 3, 1).data);
        });
      }),
    )
    .toEqual(Array.from({ length: 9 }, () => [21, 32, 47, 255]).flat());
  for (const [preset, div, curl] of [
    ["uniform", "0.000000", "0.000000"],
    ["source", "2.000000", "0.000000"],
    ["sink", "-2.000000", "0.000000"],
    ["rotation", "0.000000", "2.000000"],
    ["shear", "0.000000", "-1.000000"],
  ]) {
    await page.getByRole("combobox", { name: "Trường mẫu", exact: true }).selectOption(preset);
    await expect(value(page, "Divergence")).toHaveText(div);
    await expect(value(page, "Curl z")).toHaveText(curl);
  }
  expect(errors).toEqual([]);
});

test("wind gradient layer stays separate from velocity and overlay changes retain tracer state", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("combobox", { name: "Trường mẫu", exact: true }).selectOption("uniform");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(value(page, "Tick")).toHaveText("1");
  await page.getByRole("combobox", { name: "Lớp màu", exact: true }).selectOption("gradient");
  await expect(value(page, "Tick")).toHaveText("1");
  await expect(value(page, "Vector (vx; vy)")).toHaveText("1.000000; 0.250000");
  const canvas = page.getByLabel("Bản đồ trường vector", { exact: true });
  await canvas.press("ArrowRight");
  await expect(value(page, "Gradient φ")).toHaveText("0.062500; 0.000000");
  await page.getByLabel("Xem sạch", { exact: true }).check();
  await expect(value(page, "Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Kiểm chứng trường chuẩn", exact: true }).click();
  await expect(value(page, "Kiểm chứng")).toContainText("PASS");
  await expect(value(page, "Tick")).toHaveText("1");
  await page.getByRole("combobox", { name: "Trường scalar", exact: true }).selectOption("hill");
  await expect(value(page, "Vector (vx; vy)")).toHaveText("1.000000; 0.250000");
  await expect(value(page, "Tick")).toHaveText("0");
});

test("wind pointer capture, explicit editing, keyboard placement and resolution remain consistent", async ({
  page,
}, testInfo) => {
  await open(page);
  const canvas = page.getByLabel("Bản đồ trường vector", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas missing");
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.4);
  await expect(page.getByLabel("Xoáy cục bộ", { exact: true })).not.toBeChecked();
  await page.getByRole("combobox", { name: "Thao tác chuột", exact: true }).selectOption("vortex");
  await canvas.scrollIntoViewIfNeeded();
  const drag = await canvas.boundingBox();
  if (!drag) throw Error("Canvas missing after scrolling");
  await page.mouse.move(drag.x + drag.width * 0.55, drag.y + drag.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(drag.x + drag.width * 0.6, drag.y + drag.height * 0.55, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Xoáy cục bộ", { exact: true })).toBeChecked();
  await expect.poll(() => canvas.evaluate((el) => el.hasPointerCapture(1))).toBe(false);
  await page.getByRole("combobox", { name: "Chiều xoáy", exact: true }).selectOption("-2");
  await canvas.press("ArrowRight");
  await canvas.press("Enter");
  await expect(value(page, "Tick")).toHaveText("0");
  await page.setViewportSize({ width: 1200, height: 850 });
  await page.getByRole("combobox", { name: "Độ phân giải", exact: true }).selectOption("129");
  await expect(value(page, "Mẫu trường / glyph hiển thị")).toHaveText("12513 / 221");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(value(page, "Lưới / dx / dy")).toContainText("65 × 49");
  await expect(page.getByLabel("Xoáy cục bộ", { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(value(page, "Tick")).not.toHaveText("0");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await canvas.screenshot({ path: testInfo.outputPath("wind-map-canvas.png") });
});

test("wind tracer toggle, pause, reset and reduced motion keep time bounded", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(value(page, "Tick")).not.toHaveText("0");
  await page.getByLabel("Hạt đánh dấu", { exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  const stopped = await value(page, "Tick").textContent();
  await page.waitForTimeout(180);
  await expect(value(page, "Tick")).toHaveText(stopped!);
  await page.getByLabel("Hạt đánh dấu", { exact: true }).check();
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(value(page, "Tick")).not.toHaveText(stopped!);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(value(page, "Tick")).toHaveText("0");
});

test("wind final source loads only project 48 JSON and copy and ZIP controls work", async ({
  page,
  context,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/project-sources/")) requested.push(request.url());
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedSource: string }).copiedSource = value;
        },
      },
    }),
  );
  await open(page);
  await expect(page.locator("#ma-hoan-chinh-cua-project")).toHaveText("Toàn bộ mã nguồn của dự án");
  const cmake = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^CMakeLists\.txt$/ }) });
  await expect(cmake).toHaveAttribute("data-ready", "true");
  await cmake.locator("summary").click();
  await expect(cmake.locator("pre code")).toContainText("PROJECT_CHECKPOINT_COUNT 9");
  const copy = cmake.getByRole("button", { name: "Sao chép đoạn code", exact: true });
  await copy.click();
  await expect(copy).toHaveText("ĐÃ CHÉP");
  expect(
    await page.evaluate(() => (window as unknown as { copiedSource: string }).copiedSource),
  ).toContain("SDL3::SDL3");
  const main = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^src\/main\.cpp$/ }) });
  await expect(main).toHaveAttribute("data-ready", "true");
  await main.locator("summary").click();
  await expect(main.locator("pre code")).toContainText("wind::drawWorkshop");
  await expect(page.locator('[data-theme="one-dark-pro"]').first()).toBeAttached();
  const response = await context.request.get("/downloads/project-48-wind-map.zip", {
    timeout: 5000,
  });
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 2).toString("ascii")).toBe("PK");
  expect(requested.length).toBeGreaterThanOrEqual(2);
  expect(requested.every((url) => new URL(url).pathname.startsWith("/project-sources/48/"))).toBe(
    true,
  );
});

test("wind nine lesson routes retain dark theme and progress across navigation and reload", async ({
  page,
}) => {
  const key = "simulation-path-progress-v2";
  await page.addInitScript((key) => {
    localStorage.setItem("simulation-path-theme", "dark");
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          completedLessonIds: ["p47-l01", "p48-l01"],
          projectContentVersions: { p47: 2 },
        }),
      );
  }, key);
  await open(page);
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completedLessonIds, key),
    )
    .toEqual(["p47-l01"]);
  for (const lesson of project.lessons) {
    await open(page, "/projects/wind-map/" + lesson.slug);
    await expect(page.locator(".lesson-hero h1")).toHaveText(lesson.title);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
  await page.reload();
  await expect(page.locator('[data-wind-ready="true"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completedLessonIds, key),
    )
    .toEqual(["p47-l01"]);
});
