import { expect, test, type Page } from "@playwright/test";
const route = "/projects/brute-force-particle-query/07-hoan-thien-kinh-lup-va-nghiem-thu";
const output = (page: Page, label: string) =>
  page.locator(".lab-readout div").filter({ hasText: label }).locator("dd");
function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("Project 27 full reload hydrates, draws all 100k, benchmarks and scales", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="Đám mây particle"]');
  await expect(canvas).toBeVisible();
  await expect(output(page, "Dữ liệu / số điểm đã vẽ")).toContainText("100.000 / 100.000");
  await page.getByLabel("Số hạt", { exact: true }).selectOption("10000");
  await expect(output(page, "Đã quét / hits")).toContainText("10.000");
  await page.getByLabel("Bán kính R", { exact: true }).press("End");
  await page.getByRole("button", { name: "Chạy benchmark", exact: true }).click();
  await expect(output(page, "Benchmark / checksum")).not.toHaveText("chưa chạy", {
    timeout: 20000,
  });
  await expect(output(page, "Benchmark / checksum")).toContainText("480.000 scans");
  await page.getByRole("button", { name: "Chạy scaling", exact: true }).click();
  const rows = page.getByRole("table", { name: "Bảng thời gian theo số hạt" }).locator("tbody tr");
  await expect(rows).toHaveCount(3, { timeout: 20000 });
  await expect(rows.nth(0)).toContainText("48.000");
  await expect(rows.nth(1)).toContainText("480.000");
  await expect(rows.nth(2)).toContainText("4.800.000");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(output(page, "Dữ liệu / số điểm đã vẽ")).toContainText("100.000 / 100.000");
  await expect(output(page, "Benchmark / checksum")).toHaveText("chưa chạy");
  expect(errors).toEqual([]);
});

test("Project 27 lens capture, keyboard, cancellation and clean mode", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(route);
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
    await page.mouse.down();
    await expect(output(page, "Auto probe / pointer")).toContainText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
    await page.mouse.up();
    await expect(output(page, "Auto probe / pointer")).toContainText("đã nhả");
  }
  await canvas.press("ArrowRight");
  await canvas.press("Tab");
  await page.getByRole("button", { name: "Chạy scaling", exact: true }).click();
  await page.getByRole("button", { name: "Dừng / hủy job", exact: true }).click();
  await expect(output(page, "Job hữu hạn")).toHaveText("đã dừng");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByLabel("Số hạt", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(page.getByLabel("Số hạt", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Project 27 reduced motion and early lessons expose no future query output", async ({
  page,
}) => {
  const errors = errorsOf(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(output(page, "Auto probe / pointer")).toContainText("paused");
  await page.goto("/projects/brute-force-particle-query/01-tao-cloud-100000-particles");
  await expect(page.getByRole("button", { name: "Chạy benchmark", exact: true })).toHaveCount(0);
  await expect(page.locator(".lab-readout")).not.toContainText("ĐÃ QUÉT / HITS");
  await page.goto(
    "/projects/brute-force-particle-query/03-quet-toan-bo-particles-bang-brute-force",
  );
  await page.getByLabel("Số hạt đã quét", { exact: true }).press("Home");
  await expect(output(page, "Đã quét / hits")).toHaveText("0 / 0");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(output(page, "Đã quét / hits")).toContainText("10.000");
  expect(errors).toEqual([]);
});
