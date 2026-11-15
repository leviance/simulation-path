import { expect, test } from "@playwright/test";
const readout = (page: import("@playwright/test").Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd")
    .first();
test("P50 first checkpoint gates physics and publishes highlighted complete source", async ({
  page,
}) => {
  await page.goto("/projects/sph-water/01-ve-hat-va-be-nuoc");
  await expect(page.locator('[data-sph-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Đổ một đợt", exact: true })).toHaveCount(0);
  await expect(readout(page, "Số hạt / khối lượng")).toContainText("1000 /");
  await expect(page.locator('.prose [data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator(".checkpoint-source")).toBeVisible();
});
test("P50 pair experiment shows independent pressure balance and dissipative viscosity", async ({
  page,
}) => {
  await page.goto("/projects/sph-water/06-artificial-viscosity");
  await page.getByText("Thí nghiệm lực trên hai hạt độc lập", { exact: true }).click();
  await expect(readout(page, "Pressure A / B")).toHaveText("40000.000 / 80000.000 N/m");
  await expect(readout(page, "Tổng lực nội")).toContainText("0.000000");
  await expect(readout(page, "Công suất viscosity")).toHaveText("-224.529475243 W");
  await page.getByLabel("Chuyển động tương đối", { exact: true }).selectOption("separate");
  await expect(readout(page, "Pi của cặp")).toHaveText("0.000000000");
  await expect(readout(page, "Công suất viscosity")).toHaveText("0.000000000 W");
  await expect(readout(page, "Lực pressure A / B")).toContainText("-962.899070");
});
test("P50 final starts with 5000 actual particles and native-equivalent controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/sph-water/12-kiem-chung-va-ban-hoan-chinh");
  await expect(page.locator('[data-sph-ready="true"]')).toBeVisible();
  await expect(readout(page, "Số hạt / khối lượng")).toHaveText("5000 / 24500.00 kg");
  const canvas = page.getByLabel("Mô phỏng nước SPH 2D", { exact: true });
  await canvas.press("n");
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 1");
  await expect(readout(page, "Cập nhật / vẽ")).toHaveText("5000 / 5000");
  await page.getByText("Tham số và công cụ thí nghiệm", { exact: true }).click();
  const time = await readout(page, "Thời gian mô phỏng").textContent();
  await page.getByRole("button", { name: "Kiểm chứng ca chuẩn", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ca chuẩn riêng:" })).toContainText(
    "PASS",
  );
  await expect(readout(page, "Thời gian mô phỏng")).toHaveText(time!);
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
test("P50 keyboard emission and reset preserve selected preset and settings", async ({ page }) => {
  await page.goto("/projects/sph-water/12-kiem-chung-va-ban-hoan-chinh");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("empty");
  const canvas = page.getByLabel("Mô phỏng nước SPH 2D", { exact: true });
  await canvas.press("Enter");
  await expect(readout(page, "Số hạt / khối lượng")).toHaveText("7 / 34.30 kg");
  await canvas.press("Enter");
  await expect(readout(page, "Đổ thành công / từ chối")).toHaveText("7 / 7");
  await canvas.press("ArrowRight");
  await canvas.press("Enter");
  await expect(readout(page, "Số hạt / khối lượng")).not.toHaveText("7 / 34.30 kg");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Cảnh mẫu", { exact: true })).toHaveValue("empty");
  await expect(readout(page, "Số hạt / khối lượng")).toHaveText("0 / 0.00 kg");
});
test("P50 pointer capture, paddle target, resizing and navigation have no script errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/projects/sph-water/12-kiem-chung-va-ban-hoan-chinh");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("obstacle");
  await page.getByText("Tham số và công cụ thí nghiệm", { exact: true }).click();
  await page.getByLabel("Công cụ chuột", { exact: true }).selectOption("paddle");
  const canvas = page.getByLabel("Mô phỏng nước SPH 2D", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const b = (await canvas.boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.4, { steps: 5 });
  await page.mouse.up();
  await canvas.press("n");
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 1");
  await page.setViewportSize({ width: 1080, height: 850 });
  await expect(canvas).toBeVisible();
  await page.goto("/projects/sph-water");
  expect(errors).toEqual([]);
});
