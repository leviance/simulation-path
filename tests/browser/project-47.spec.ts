import { expect, test, type Page } from "@playwright/test";
import project from "../../course/projects/p47/manifest";
const final = "/projects/heat-plate/09-kiem-chung-va-ban-hoan-chinh";
const row = (page: Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
test("heat lessons gate the solver, expose a real full-sized pulse and retain aliases", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/heat-plate/01-ve-ban-do-nhiet");
  await expect(page.getByRole("button", { name: /Tiến một bước/ })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: /^D =/ })).toHaveCount(0);
  await expect(row(page, "Lưới")).toContainText("32 × 32");
  await page.goto("/projects/heat-plate/08-kiem-chung-va-ban-hoan-chinh");
  await expect(page).toHaveURL(final);
  await expect(row(page, "Lưới")).toContainText("192 × 192 · 36864 ô");
  await page.getByRole("combobox", { name: "Cảnh mẫu", exact: true }).selectOption("5");
  await page.getByRole("slider", { name: /Bán kính/ }).press("Home");
  const plate = page.getByLabel("Tấm kim loại nóng", { exact: true });
  await plate.press("Enter");
  await expect(row(page, "Ô đang chọn")).toContainText("theta = 1.00000");
  await page.getByRole("button", { name: "Tiến một bước (N)", exact: true }).click();
  await expect(row(page, "Ô đang chọn")).toContainText("theta = 0.200000");
  await expect(row(page, "Ô xét / update")).toContainText("36864");
  const tick = await row(page, "Thời gian / tick").textContent();
  await page.getByRole("button", { name: "Kiểm fixture riêng", exact: true }).click();
  await expect(row(page, "Fixture nhỏ chuẩn riêng")).toContainText("PASS");
  await expect(row(page, "Thời gian / tick")).toHaveText(tick!);
  await expect(plate).toBeVisible();
  expect(errors).toEqual([]);
});
test("heat sliders drive a bounded unsafe experiment rather than merely disabling controls", async ({
  page,
}) => {
  await page.goto(final);
  await page.getByRole("combobox", { name: "Cảnh mẫu", exact: true }).selectOption("2");
  const dt = page.getByRole("slider", { name: /^dt =/ });
  await dt.evaluate((element) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "0.05");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(row(page, "Ổn định của scheme")).toContainText("không đạt");
  await page.getByRole("button", { name: "Tiến một bước (N)", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bước bị chặn" })).toBeVisible();
  await expect(row(page, "Thời gian / tick")).toContainText("/ 0");
  await page.getByRole("checkbox", { name: /Cho phép thí nghiệm bất ổn/ }).check();
  for (let step = 0; step < 13; step++)
    await page.getByRole("button", { name: "Tiến một bước (N)", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ứng viên vượt" })).toBeVisible();
  await expect(row(page, "Thời gian / tick")).toContainText("/ 12");
  await expect(row(page, "Min / max theta")).toContainText("-13.6735");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(row(page, "Thời gian / tick")).toContainText("/ 0");
});
test("heat pointer capture, probe, resize and reduced motion retain coherent state", async ({
  page,
}) => {
  await page.goto(final);
  const plate = page.getByLabel("Tấm kim loại nóng", { exact: true });
  await page.getByRole("combobox", { name: "Cảnh mẫu", exact: true }).selectOption("5");
  await plate.scrollIntoViewIfNeeded();
  const bounds = await plate.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 30, bounds!.y + bounds!.height / 2 + 20);
  await page.mouse.up();
  await expect(row(page, "Min / max theta")).toContainText("1.00000");
  await plate.press("l");
  await expect(row(page, "Probe")).toContainText("theta = 1.00000");
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(row(page, "Lưới")).toContainText("192 × 192");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một bước (N)", exact: true }).click();
  const stepped = await row(page, "Thời gian / tick").textContent();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(200);
  await expect(row(page, "Thời gian / tick")).toHaveText(stepped!);
});

test("heat heater/unpin, cold rim, clear/reset, D and resolution controls use the actual model", async ({
  page,
}) => {
  await page.goto(final);
  const select = (name: string) => page.getByRole("combobox", { name, exact: true });
  const plate = page.getByLabel("Tấm kim loại nóng", { exact: true });
  await select("Cảnh mẫu").selectOption("5");
  await page.getByRole("slider", { name: /Bán kính/ }).press("Home");
  await select("Bút").selectOption("heater");
  await plate.press("Enter");
  await expect(row(page, "Heater")).toContainText("1 ô");
  await page.getByRole("button", { name: "Tiến một bước (N)", exact: true }).click();
  await expect(row(page, "Ô đang chọn")).toContainText("theta = 1.00000");
  await select("Bút").selectOption("unpin");
  await plate.press("Enter");
  await expect(row(page, "Heater")).toContainText("0 ô");
  await expect(row(page, "Ô đang chọn")).toContainText("theta = 1.00000");
  await select("Điều kiện biên").selectOption("rim");
  await plate.press("Home");
  for (let index = 0; index < 7; index++) await plate.press("Shift+ArrowLeft");
  await plate.press("1");
  await plate.press("Enter");
  await expect(row(page, "Ô đang chọn")).toContainText("(0, 96) · theta = 0.00000");
  await page.getByRole("slider", { name: /^D =/ }).press("Home");
  await expect(row(page, "dx / dy / dt tối đa")).toContainText("không có CFL bound khi D=0");
  await select("Độ phân giải (cùng L = 96)").selectOption("256");
  await expect(row(page, "Lưới")).toContainText("256 × 256 · 65536 ô");
  await expect(row(page, "dx / dy / dt tối đa")).toContainText("0.375 / 0.375");
  await page.getByRole("checkbox", { name: /Xem sạch/ }).check();
  await page.getByRole("checkbox", { name: /Đánh dấu ô giữ nhiệt/ }).uncheck();
  await select("Cảnh mẫu").selectOption("0");
  await page.getByRole("button", { name: "Xóa nhiệt/heater", exact: true }).click();
  await expect(row(page, "Min / max theta")).toHaveText("0.00000 / 0.00000");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(row(page, "Min / max theta")).not.toHaveText("0.00000 / 0.00000");
  await plate.screenshot({ path: test.info().outputPath("heat-plate-canvas.png") });
});

test("heat complete-source copy handler and ZIP route load only this project's source", async ({
  page,
  context,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/project-sources/")) requested.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedSource: string }).copiedSource = value;
        },
      },
    });
  });
  await page.goto(final);
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
  await expect(main.locator("pre code")).toContainText("heat::drawTexture");
  await expect(page.locator('[data-theme="one-dark-pro"]').first()).toBeAttached();
  const link = page.locator('a[href="/downloads/project-47-heat-plate.zip"]').first();
  await expect(link).toBeAttached();
  const response = await context.request.get((await link.getAttribute("href"))!, { timeout: 5000 });
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 2).toString("ascii")).toBe("PK");
  expect(requested.length).toBeGreaterThanOrEqual(2);
  expect(requested.every((url) => new URL(url).pathname.startsWith("/project-sources/47/"))).toBe(
    true,
  );
});

test("heat nine lesson routes, dark navigation and scoped progress migration match the new edition", async ({
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
          completedLessonIds: ["p46-l01", "p47-l07", "p48-l01"],
          projectContentVersions: { p46: 2, p48: 2 },
        }),
      );
  }, key);
  await page.goto("/projects/heat-plate/07-do-doc-truong-nhiet");
  await expect(page).toHaveURL("/projects/heat-plate/08-doc-truong-nhiet-va-canh-mau");
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completedLessonIds, key),
    )
    .toEqual(["p46-l01", "p48-l01"]);
  for (const lesson of project.lessons) {
    await page.goto("/projects/heat-plate/" + lesson.slug);
    await expect(page.locator(".lesson-hero h1")).toHaveText(lesson.title);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('[data-heat-ready="true"]')).toBeAttached();
  }
  await page.locator(".lesson-nav a").first().click();
  await expect(page.locator(".lesson-hero h1")).toHaveText(project.lessons[7].title);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
