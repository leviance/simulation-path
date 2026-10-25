import { expect, test, type Page } from "@playwright/test";

function errorsFrom(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
const final = "/projects/boids-spatial-grid/10-hoan-thien-dan-boids-lon";

test("Project 28 updates all 10000 agents and retains pause after a single step", async ({
  page,
}) => {
  const errors = errorsFrom(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(final);
  const canvas = page.getByLabel("Đàn Boids lớn với Spatial Grid", { exact: true });
  const lab = page.locator("[data-grid-count]");
  await expect(canvas).toBeVisible();
  await page.getByLabel("Số cá thể", { exact: true }).selectOption("10000");
  await expect(lab).toHaveAttribute("data-grid-count", "10000");
  await canvas.focus();
  await canvas.press("n");
  await expect(lab).toHaveAttribute("data-grid-steps", "1", { timeout: 15000 });
  await expect(lab).toHaveAttribute("data-grid-paused", "true");
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Project 28 validates a small flock, changes method without resetting and cancels benchmark", async ({
  page,
}) => {
  const errors = errorsFrom(page);
  await page.goto(final);
  const lab = page.locator("[data-grid-count]");
  await page.getByLabel("Số cá thể", { exact: true }).selectOption("1024");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(lab).toHaveAttribute("data-grid-steps", "1");
  await page.getByLabel("Tìm hàng xóm", { exact: true }).selectOption("brute");
  await expect(lab).toHaveAttribute("data-grid-steps", "1");
  await page.getByRole("button", { name: "Đối chiếu toàn đàn nhỏ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đối chiếu" })).toContainText(
    "hoàn tất",
    { timeout: 15000 },
  );
  await expect(page.getByRole("status").filter({ hasText: "Đối chiếu" })).toContainText(
    "0 sai khác",
  );
  await page.getByRole("button", { name: "Đo theo N (phân bố đều)", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đang đo" })).toBeVisible();
  await page.getByRole("button", { name: "Dừng / hủy công việc", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đang đo" })).toHaveCount(0);
  await expect(lab).toHaveAttribute("data-grid-steps", "1");
  expect(errors).toEqual([]);
});

test("Project 28 source link and pointer/keyboard controls remain available", async ({ page }) => {
  const errors = errorsFrom(page);
  await page.goto(final);
  // Check the link, not a browser download-tracking wait.
  await expect(
    page.locator('a[href="/downloads/project-28-boids-spatial-grid.zip"]').first(),
  ).toBeVisible();
  const canvas = page.getByLabel("Đàn Boids lớn với Spatial Grid", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas has no layout box");
  const selected = page
    .locator(".lab-readout div")
    .filter({ hasText: "Cá thể đang chọn" })
    .locator("dd");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  const before = await selected.textContent();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.5);
  await page.mouse.up();
  await expect(selected).not.toHaveText(before ?? "");
  await canvas.press("ArrowRight");
  await canvas.press("d");
  await expect(page.getByLabel("Hiện debug", { exact: true })).not.toBeChecked();
  expect(errors).toEqual([]);
});
