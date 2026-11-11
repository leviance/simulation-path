import { expect, test, type Locator, type Page } from "@playwright/test";

const overview = "/projects/particle-morph-studio";
const canvasName = "Canvas Project 42: biến hình hạt";
test.use({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });

async function signature(canvas: Locator) {
  return canvas.evaluate((element) => {
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 64;
    sample.getContext("2d")!.drawImage(element as HTMLCanvasElement, 0, 0, 96, 64);
    return sample.toDataURL();
  });
}
async function openLab(page: Page, lesson: string) {
  await page.goto(overview + "/" + lesson);
  const canvas = page.locator('canvas[aria-label="' + canvasName + '"]');
  await expect(canvas).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^ACTIVE #/ })).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  return canvas;
}
const active = (page: Page) => page.locator("p").filter({ hasText: /^ACTIVE #/ });

test("Project 42 exposes the challenge, ten lessons, ZIP and isolated progress migration", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("p42-fixture")) return;
    localStorage.setItem("p42-fixture", "set");
    localStorage.setItem(
      "simulation-path-progress-v2",
      JSON.stringify({
        version: 2,
        completedLessonIds: ["p41-l09", "p42-l01"],
        projectContentVersions: { p41: 2 },
        lastLessonId: "p42-l01",
      }),
    );
  });
  await page.goto(overview);
  await expect(page.locator("#challenge-42")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Các bài của Dự án 42" }).getByRole("link"),
  ).toHaveCount(10);
  await expect(
    page.locator('a[href="/downloads/project-42-particle-morph-studio.zip"]').first(),
  ).toBeVisible();
  const archive = await page.request.get("/downloads/project-42-particle-morph-studio.zip");
  expect(archive.status()).toBe(200);
  const bytes = await archive.body();
  expect(bytes.length).toBeGreaterThan(1000);
  expect([...bytes.subarray(0, 4)]).toEqual([80, 75, 3, 4]);
  await openLab(page, "01-tu-hai-hinh-den-chuyen-dong");
  const complete = page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
  await expect(complete).toHaveAttribute("aria-pressed", "false");
  await complete.click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("simulation-path-progress-v2")!),
  );
  expect(stored.completedLessonIds).toEqual(["p41-l09", "p42-l01"]);
  expect(stored.projectContentVersions.p42).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("area lab supports keyboard, pointer capture, DPR and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await openLab(page, "02-lay-mau-theo-dien-tich");
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => (el as HTMLCanvasElement).width / Math.round(el.getBoundingClientRect().width),
      ),
    )
    .toBe(2);
  const before = await signature(canvas);
  await page.getByRole("slider", { name: "u barycentric" }).press("End");
  await expect.poll(() => signature(canvas)).not.toBe(before);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x - 10, box.y + 10);
  await page.mouse.up();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(page.getByText(/Reduced motion đang bật/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
});

test("matching A/B changes paths without replacing samples or generation", async ({ page }) => {
  const canvas = await openLab(page, "04-ghep-diem-random-va-spatial");
  const retained = await active(page).innerText();
  const first = await signature(canvas);
  await page.getByLabel("Ghép điểm A/B (không rải lại)").selectOption("random");
  await expect(active(page)).toHaveText(retained);
  await expect.poll(() => signature(canvas)).not.toBe(first);
  await canvas.focus();
  await canvas.press("End");
  await expect(page.getByRole("slider", { name: /Timeline/ })).toHaveValue("1");
  await canvas.press("Home");
  await expect(page.getByRole("slider", { name: /Timeline/ })).toHaveValue("0");
  await page.getByRole("button", { name: "Reset thời gian", exact: true }).click();
  const paused = await signature(canvas);
  await page.waitForTimeout(100);
  expect(await signature(canvas)).toBe(paused);
});

test("model time advances only during Play and reverses from the exact endpoint", async ({
  page,
}) => {
  const canvas = await openLab(page, "05-model-time-easing-va-duong-cong");
  const time = page.getByRole("slider", { name: /Timeline/ });
  await canvas.focus();
  await canvas.press("Home");
  await canvas.press("Space");
  await expect.poll(async () => Number(await time.inputValue())).toBeGreaterThan(0);
  await canvas.press("Space");
  const paused = await time.inputValue();
  await page.waitForTimeout(150);
  await expect(time).toHaveValue(paused);
  await page.getByLabel("Đảo chiều").check();
  await canvas.focus();
  await canvas.press("End");
  await expect(time).toHaveValue("1");
  await canvas.press("Space");
  await expect.poll(async () => Number(await time.inputValue())).toBeLessThan(1);
  await canvas.press("Space");
});

test("Flow is the final default and changes individual paths without rebuilding samples", async ({
  page,
}) => {
  const canvas = await openLab(page, "10-studio-mot-trieu-hat");
  const path = page.getByLabel("Đường đi", { exact: true });
  await expect(path).toHaveValue("flow");
  const retained = await active(page).innerText();
  const fluid = await signature(canvas);
  await path.selectOption("arc");
  await expect.poll(() => signature(canvas)).not.toBe(fluid);
  await path.selectOption("flow");
  await expect.poll(() => signature(canvas)).toBe(fluid);
  await expect(active(page)).toHaveText(retained);
  await canvas.focus();
  await canvas.press("Home");
  await expect(page.getByRole("slider", { name: /Timeline/ })).toHaveValue("0");
  await canvas.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const source = await signature(canvas);
  await path.selectOption("straight");
  await expect.poll(() => signature(canvas)).toBe(source);
});

test("cancel, invalid inputs and replacement keep last-good generation", async ({ page }) => {
  await openLab(page, "08-chuan-bi-theo-batch-va-huy");
  const retained = await active(page).innerText();
  await page.getByLabel("Tạm dừng chuẩn bị để đọc từng batch").check();
  await page.getByLabel("Seed").fill("987");
  await page.getByRole("button", { name: "Áp dụng yêu cầu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hủy chuẩn bị", exact: true })).toBeEnabled();
  await expect(active(page)).toHaveText(retained);
  await page.getByRole("button", { name: "Hủy chuẩn bị", exact: true }).click();
  await expect(active(page)).toHaveText(retained);
  await page.getByLabel("Số mẫu Canvas (1–4.096)").fill("0");
  await page.getByRole("button", { name: "Áp dụng yêu cầu", exact: true }).click();
  await expect(active(page)).toHaveText(retained);
  await page.getByLabel("Số mẫu Canvas (1–4.096)").fill("1025");
  await page.getByLabel("Tạm dừng chuẩn bị để đọc từng batch").uncheck();
  await page.getByRole("button", { name: "Áp dụng yêu cầu", exact: true }).click();
  await expect(active(page)).toContainText("1.025");
  await expect(active(page)).toContainText("seed 987");
});

test("all ten Canvas modes load without runtime errors or horizontal page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const lesson of [
    "01-tu-hai-hinh-den-chuyen-dong",
    "02-lay-mau-theo-dien-tich",
    "03-id-seed-va-mat-do",
    "04-ghep-diem-random-va-spatial",
    "05-model-time-easing-va-duong-cong",
    "06-bo-nho-va-buffer-gpu",
    "07-compute-cap-nhat-tung-id",
    "08-chuan-bi-theo-batch-va-huy",
    "09-doc-duong-di-va-do-chi-phi",
    "10-studio-mot-trieu-hat",
  ]) {
    await openLab(page, lesson);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
  await expect(
    page.getByText("Dung lượng C++ khi N = 1.000.003 — không phải heap JavaScript"),
  ).toBeVisible();
});
