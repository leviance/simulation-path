import { expect, test, type Page } from "@playwright/test";

const base = "/projects/boids-2d";
const route = `${base}/09-kiem-chung-va-du-an-hoan-chinh`;
const progressKey = "simulation-path-progress-v2";
const lab = (page: Page) => page.locator("[data-boids-stage]");
const canvasOf = (page: Page) => page.getByLabel("Mô phỏng đàn Boids 2D", { exact: true });
const output = (page: Page, label: string) =>
  lab(page).locator(".lab-readout div").filter({ hasText: label }).locator("dd");
const button = (page: Page, name: string) => lab(page).getByRole("button", { name, exact: true });

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("Project 27 reload, full-flock work, seeded reset and Pause from canvas focus", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto(route);
  await expect(canvasOf(page)).toBeVisible();
  await expect(lab(page)).toHaveAttribute("data-boids-stage", "9");
  await expect(lab(page)).toHaveAttribute("data-boids-paused", "true");
  await page.getByLabel("Số cá thể", { exact: true }).selectOption("1024");
  await page.getByLabel("Seed", { exact: true }).selectOption("7");
  await expect(lab(page)).toHaveAttribute("data-boids-count", "1024");
  const initial = await output(page, "Cá thể đang chọn").innerText();
  await button(page, "Tiến một bước").click();
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "1");
  await expect(output(page, "Hàng xóm / số phép kiểm toàn đàn")).toHaveText(/\d+ \/ 1\.047\.552/);
  await button(page, "Đặt lại").click();
  await expect(output(page, "Cá thể đang chọn")).toHaveText(initial);
  await expect(lab(page)).toHaveAttribute("data-boids-count", "1024");
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "0");

  // Bắt đầu bằng bàn phím để focus nằm trên Canvas trước khi bấm Pause.
  await canvasOf(page).press("Space");
  await expect
    .poll(async () => Number(await lab(page).getAttribute("data-boids-steps")))
    .toBeGreaterThan(1);
  await button(page, "Tạm dừng").click();
  await expect(lab(page)).toHaveAttribute("data-boids-paused", "true");
  const stoppedAt = await lab(page).getAttribute("data-boids-steps");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(lab(page)).toHaveAttribute("data-boids-steps", stoppedAt!);
  await page.reload();
  await expect(lab(page)).toHaveAttribute("data-boids-count", "256");
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "0");
  expect(errors).toEqual([]);
});

test("Project 27 pointer capture, selection keys and clean-mode controls", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(route);
  const canvas = canvasOf(page);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Boids canvas has no layout box");
  const scale = Math.min((box.width - 32) / 960, (box.height - 32) / 600);
  const left = box.x + (box.width - 960 * scale) / 2;
  const top = box.y + (box.height - 600 * scale) / 2;
  await page.mouse.move(left + 200 * scale, top + 200 * scale);
  await page.mouse.down();
  await page.mouse.move(left + 300 * scale, top + 250 * scale, { steps: 3 });
  await page.mouse.up();
  const selected = await output(page, "Cá thể đang chọn").innerText();
  const values = /ID (\d+) · \(([\d.]+), ([\d.]+)\)/.exec(selected);
  if (!values) throw new Error(`Invalid selection readout: ${selected}`);
  expect(Number(values[2])).toBeCloseTo(300, 0);
  expect(Number(values[3])).toBeCloseTo(250, 0);
  // Di chuyển chuột sau khi nhả không được tiếp tục kéo cá thể.
  await page.mouse.move(left + 400 * scale, top + 350 * scale);
  await expect(output(page, "Cá thể đang chọn")).toHaveText(selected);
  await canvas.press("ArrowRight");
  await expect(output(page, "Cá thể đang chọn")).toContainText(
    `ID ${(Number(values[1]) + 1) % 256} ·`,
  );
  await canvas.press("n");
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "1");
  await button(page, "Ẩn debug").click();
  await expect(button(page, "Hiện debug")).toBeVisible();
  await expect(page.getByLabel("Số cá thể", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Separation", { exact: true })).toBeVisible();
  await button(page, "Tiến một bước").click();
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "2");
  expect(errors).toEqual([]);
});

test("Project 27 bounded benchmark reports full work at three sizes and can cancel", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto(route);
  await button(page, "Đo 256 / 512 / 1024").click();
  const rows = lab(page).getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(3, { timeout: 20000 });
  for (const [index, count] of [256, 512, 1024].entries()) {
    await expect(rows.nth(index).locator("td").nth(0)).toHaveText(String(count));
    await expect(rows.nth(index).locator("td").nth(1)).toHaveText(String(count * (count - 1)));
    const median = Number(await rows.nth(index).locator("td").nth(2).innerText());
    expect(Number.isFinite(median)).toBe(true);
    expect(median).toBeGreaterThanOrEqual(0);
  }
  await expect(lab(page).getByRole("status")).toHaveCount(0);
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "0");
  await expect(lab(page)).toHaveAttribute("data-boids-count", "256");
  await button(page, "Đo 256 / 512 / 1024").click();
  await button(page, "Dừng / hủy phép đo").click();
  await expect(lab(page).getByRole("status")).toHaveCount(0);
  await expect(button(page, "Chạy mô phỏng")).toBeEnabled();
  await expect(lab(page)).toHaveAttribute("data-boids-paused", "true");
  expect(errors).toEqual([]);
});

test("Project 27 reduced motion allows manual steps but never starts playback", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(button(page, "Chạy mô phỏng")).toBeDisabled();
  await canvasOf(page).press("Space");
  await expect(lab(page)).toHaveAttribute("data-boids-paused", "true");
  await canvasOf(page).press("n");
  await expect(lab(page)).toHaveAttribute("data-boids-steps", "1");
  await expect(output(page, "Đã cập nhật")).toHaveText("1 bước · t=0.017 s");
  expect(errors).toEqual([]);
});

test("Project 27 SPA lesson change remounts the correct stage without future controls", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.goto(`${base}/01-ve-va-di-chuyen-mot-ca-the`);
  await expect(lab(page)).toHaveAttribute("data-boids-stage", "1");
  await expect(lab(page)).toHaveAttribute("data-boids-count", "1");
  await expect(page.getByLabel("Số cá thể", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Bán kính hàng xóm", { exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.dataset.boidsNavigationProbe = "same-document";
  });
  await page.getByRole("link", { name: /BÀI TIẾP/ }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/02-tao-dan-va-mien-tuan-hoan$`));
  await expect(lab(page)).toHaveAttribute("data-boids-stage", "2");
  await expect(lab(page)).toHaveAttribute("data-boids-count", "256");
  await expect(page.locator("html")).toHaveAttribute(
    "data-boids-navigation-probe",
    "same-document",
  );
  await expect(page.getByLabel("Số cá thể", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Separation", { exact: true })).toHaveCount(0);
  await expect(button(page, "Đo 256 / 512 / 1024")).toHaveCount(0);
  await button(page, "Tiến một bước").click();
  await expect(output(page, "Hàng xóm / số phép kiểm toàn đàn")).toHaveText("0 / 0");
  expect(errors).toEqual([]);
});

test("Project 27 rebuild migrates legacy progress without clearing other projects", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.addInitScript(
    ({ key }) => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          completedLessonIds: ["p01-l01", "p27-l01", "p27-l07"],
          lastLessonId: "p27-l07",
          lastLesson: {
            id: "p27-l07",
            title: "Kính lúp cũ",
            href: "/projects/brute-force-particle-query/07-hoan-thien-kinh-lup-va-nghiem-thu",
          },
        }),
      );
    },
    { key: progressKey },
  );
  await page.goto(`${base}/01-ve-va-di-chuyen-mot-ca-the`);
  const complete = page.getByRole("button", { name: "Đánh dấu hoàn thành" });
  await expect(complete).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), progressKey),
    )
    .toMatchObject({
      completedLessonIds: ["p01-l01"],
      lastLessonId: "p27-l01",
      projectContentVersions: { p27: 1 },
    });
  await complete.click();
  await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).completedLessonIds,
      progressKey,
    ),
  ).toEqual(["p01-l01", "p27-l01"]);
  expect(errors).toEqual([]);
});
