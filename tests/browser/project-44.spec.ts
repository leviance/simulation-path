import { expect, test, type Page } from "@playwright/test";
import project from "../../course/projects/p44/manifest";

const overview = "/projects/volume-sculptor";
const modes = [
  "tetra",
  "cells",
  "normals",
  "brush",
  "stroke",
  "field",
  "prefix",
  "mesh",
  "dirty",
  "slice",
  "archive",
  "validation",
];
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

test("Project 44 replaces old URLs, resets only its retired progress and keeps dark navigation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((key) => {
    localStorage.setItem("simulation-path-theme", "dark");
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          completedLessonIds: ["p43-l09", "p44-l01", "p44-l09", "p45-l02"],
          projectContentVersions: { p43: 2 },
        }),
      );
  }, progressKey);
  await page.goto("/projects/neighbor-list-skin/01-ve-he-hat-va-vung-tuong-tac");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  await expect(page).toHaveURL(new RegExp(overview + "$"));
  await expect(page.getByLabel("Chờ nghiệm thu", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Nội dung thuộc bản cũ", { exact: true })).toHaveCount(0);
  await expect(page.locator(".project-challenge")).toContainText("khoét");
  const lessons = page.locator(".lesson-list > a");
  await expect(lessons).toHaveCount(12);
  if (process.env.P44_CAPTURE_PREVIEW === "1") {
    const canvas = page.locator('[data-volume-mode="validation"] canvas');
    await canvas.scrollIntoViewIfNeeded();
    await expect(row(page, "Trạng thái")).toContainText("current");
    await page.getByRole("button", { name: "Chạy nét cọ khoét xuyên cầu", exact: true }).click();
    await expect(row(page, "Trạng thái")).toContainText("current");
    await canvas.screenshot({
      path: testInfo.outputPath("project-44-web-canvas.png"),
      timeout: 5000,
    });
  }
  await lessons.first().click();
  await expect(page).toHaveURL(new RegExp(project.lessons[0].slug + "$"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const complete = page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
  await expect(complete).toHaveAttribute("aria-pressed", "false");
  await complete.click();
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(state.completedLessonIds).toEqual(["p43-l09", "p45-l02", "p44-l01"]);
  expect(state.projectContentVersions.p44).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

for (const start of [0, 4, 8]) {
  test(`Project 44 lesson routes ${start + 1}–${start + 4} mount their actual lazy Canvas`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (let index = start; index < start + 4; ++index) {
      const lesson = project.lessons[index];
      await page.goto(overview + "/" + lesson.slug);
      await expect(page.locator("article h1")).toHaveText(lesson.title);
      const lab = page.locator(`[data-volume-mode="${modes[index]}"]`),
        canvas = lab.locator("canvas");
      await expect(canvas).toBeVisible();
      await expect(lab).toHaveAttribute("data-ready", "true");
      await canvas.scrollIntoViewIfNeeded();
      if (index === 0) {
        await lab.getByRole("button", { name: "Hai đỉnh trong", exact: true }).click();
        await expect(row(page, "Triangle / suy biến bỏ qua")).toHaveText("2 / 0");
      } else {
        await expect(row(page, "Trạng thái")).toContainText("current");
        const generation = await row(page, "Generation muốn / đang vẽ").innerText();
        await canvas.focus();
        await canvas.press("ArrowRight");
        await expect(row(page, "Generation muốn / đang vẽ")).toHaveText(generation);
      }
      expect(
        await canvas.evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          return canvas.width / Math.round(canvas.getBoundingClientRect().width);
        }),
      ).toBeCloseTo(1.5, 2);
    }
    expect(errors).toEqual([]);
  });
}

test("Project 44 final exposes complete source, bounded source fetches, code copy and the correct ZIP", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    sourceRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/project-sources/")) sourceRequests.push(request.url());
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(overview + "/" + project.lessons[11].slug);
  await expect(page.locator("#ma-hoan-chinh-cua-project")).toHaveText("Toàn bộ mã nguồn của dự án");
  await expect(
    page.locator('a[href="/downloads/project-44-volume-sculptor.zip"]').first(),
  ).toBeVisible();
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
  await expect(main.locator("pre code")).toContainText("runSculptBenchmark");
  expect(sourceRequests.length).toBeGreaterThanOrEqual(2);
  expect(
    sourceRequests.every((url) => new URL(url).pathname.startsWith("/project-sources/44/")),
  ).toBe(true);
  const canvas = page.locator('[data-volume-mode="validation"] canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(row(page, "Trạng thái")).toContainText("current");
  await page.getByRole("checkbox", { name: "Count / prefix inspector", exact: true }).check();
  const before = await row(page, "Vertices / triangles đang vẽ").innerText();
  await page.getByLabel("Capacity cho thí nghiệm lỗi").selectOption("12");
  // Reading complete source below the viewport must not suspend a finite mesh job.
  await page.locator("#ma-hoan-chinh-cua-project").scrollIntoViewIfNeeded();
  await expect(row(page, "Trạng thái")).toContainText("failed");
  await expect(row(page, "Vertices / triangles đang vẽ")).toHaveText(before);
  await page.getByLabel("Capacity cho thí nghiệm lỗi").selectOption("98304");
  await page.locator("#ma-hoan-chinh-cua-project").scrollIntoViewIfNeeded();
  await expect(row(page, "Trạng thái")).toContainText("current");
  expect(errors).toEqual([]);
});

test("Project 44 status commands preserve last-good across Pause, step, cancel, retry and Reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(overview + "/" + project.lessons[8].slug);
  const lab = page.locator('[data-volume-mode="dirty"]');
  const canvas = lab.locator("canvas");
  await expect(lab).toHaveAttribute("data-ready", "true");
  await expect(row(page, "Trạng thái")).toContainText("current");
  const vertices = await row(page, "Vertices / triangles đang vẽ").innerText();
  await lab.getByRole("button", { name: "Pause cập nhật", exact: true }).click();
  const resume = lab.getByRole("button", { name: "Tiếp tục cập nhật", exact: true });
  await expect(resume).toHaveAttribute("aria-pressed", "true");
  await expect(
    lab.getByRole("button", { name: "Đặt một stamp tại probe · B", exact: true }),
  ).toBeDisabled();
  await lab.getByRole("button", { name: "Dựng lại toàn grid · Enter", exact: true }).click();
  await expect(row(page, "Trạng thái")).toContainText("PAUSE · count");
  const generation = await row(page, "Generation muốn / đang vẽ").innerText();
  const counted = await row(page, "Count / emit cells").innerText();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(row(page, "Generation muốn / đang vẽ")).toHaveText(generation);
  await lab.getByRole("button", { name: "Chạy một batch", exact: true }).click();
  await expect(row(page, "Count / emit cells")).not.toHaveText(counted);
  await expect(row(page, "Vertices / triangles đang vẽ")).toHaveText(vertices);
  await lab.getByRole("button", { name: "Hủy cập nhật · C", exact: true }).click();
  await expect(row(page, "Trạng thái")).toContainText("cancelled");
  await expect(row(page, "Vertices / triangles đang vẽ")).toHaveText(vertices);
  await lab.getByRole("button", { name: "Dựng lại toàn grid · Enter", exact: true }).click();
  await resume.click();
  await expect(row(page, "Trạng thái")).toContainText("current");
  await expect(row(page, "Trạng thái")).not.toContainText("PAUSE");
  await canvas.focus();
  await canvas.press("b");
  await expect(row(page, "Trạng thái")).toContainText("current");
  await expect(lab.getByRole("button", { name: "Undo · Z (1/4)", exact: true })).toBeEnabled();
  await lab.getByRole("combobox", { name: "Grid CPU", exact: true }).selectOption("12");
  await expect(row(page, "Trạng thái")).toContainText("current");
  await lab.getByRole("button", { name: "Reset lab", exact: true }).click();
  await expect(lab.getByRole("combobox", { name: "Grid CPU", exact: true })).toHaveValue("24");
  await expect(row(page, "Trạng thái")).toContainText("current");
  await expect(lab.getByRole("button", { name: "Undo · Z (0/4)", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
