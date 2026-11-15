import { expect, test, type Page } from "@playwright/test";
const root = "/projects/stable-fluids/";
const readout = (page: Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
async function open(page: Page, lesson: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(root + lesson);
  await expect(page.locator('[data-fluid-ready="true"]')).toBeVisible();
}
async function parameters(page: Page) {
  await page.getByText("Tham số và công cụ thí nghiệm", { exact: true }).click();
}
test("P49 N pauses a running solver before advancing one step", async ({ page }) => {
  await open(page, "15-kiem-chung-va-ban-hoan-chinh");
  await parameters(page);
  await page.getByLabel("Độ phân giải", { exact: true }).selectOption("16");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tạm dừng", exact: true })).toBeVisible();
  await page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true }).press("n");
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeVisible();
  const stopped = await readout(page, "Thời gian mô phỏng").textContent();
  await page.waitForTimeout(150);
  await expect(readout(page, "Thời gian mô phỏng")).toHaveText(stopped!);
});
test("P49 first checkpoint gates future tools and serves complete highlighted source", async ({
  page,
}) => {
  await open(page, "01-cua-so-va-vet-khoi");
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Công cụ", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator("#ma-chay-duoc-sau-bai")).toHaveCount(1);
});
test("P49 Jacobi hand fixture advances pressure only and restarts RHS", async ({ page }) => {
  await open(page, "05-giai-pressure-jacobi");
  await page.getByLabel("Hiện số đo", { exact: true }).check();
  await parameters(page);
  const velocity = await readout(page, "Bốn cạnh: u trái / phải; v dưới / trên").textContent();
  await page.getByRole("button", { name: "Tiến một vòng Jacobi", exact: true }).click();
  await expect(readout(page, "Pressure ô / bài toán Jacobi đang mở")).toContainText("1.875e-1");
  const canvas = page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true });
  await canvas.press("j");
  await expect(readout(page, "Pressure ô / bài toán Jacobi đang mở")).toContainText("1.992e-1");
  await expect(readout(page, "Bốn cạnh: u trái / phải; v dưới / trên")).toHaveText(velocity!);
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 0");
  await page.getByRole("button", { name: "Bắt đầu lại pressure", exact: true }).click();
  await expect(readout(page, "Pressure ô / bài toán Jacobi đang mở")).toContainText("0/160");
});
test("P49 final supports keyboard, independent validation, reset and real resolution", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "15-kiem-chung-va-ban-hoan-chinh");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("empty");
  await page.getByLabel("Hiện số đo", { exact: true }).check();
  await parameters(page);
  const canvas = page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true });
  await canvas.press("Enter");
  await expect(readout(page, "Ô đang chọn / concentration")).toContainText("1.000e+0");
  await canvas.press("w");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 1");
  await expect(readout(page, "Lần projection gần nhất: div trước → sau")).toBeVisible();
  await page.getByRole("button", { name: "Kiểm chứng ca chuẩn", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("PASS");
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 1");
  await page.getByLabel("Độ nhớt ν", { exact: true }).selectOption("0.0005");
  await page.getByLabel("Độ phân giải", { exact: true }).selectOption("256");
  await expect(readout(page, "Quy mô thực")).toContainText("65536");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Độ phân giải", { exact: true })).toHaveValue("256");
  await expect(page.getByLabel("Độ nhớt ν", { exact: true })).toHaveValue("0.0005");
  await expect(readout(page, "Thời gian mô phỏng")).toContainText("tick 0");
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
test("P49 pointer click paints, stir drag does not paint, resize and cleanup stay safe", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "15-kiem-chung-va-ban-hoan-chinh");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("empty");
  await page.getByLabel("Hiện số đo", { exact: true }).check();
  const canvas = page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas not measured");
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(readout(page, "Min / max / tích phân scalar")).not.toContainText(
    "0.000e+0 / 0.000e+0 / 0.000e+0",
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  if (!b) throw Error("Canvas not measured");
  await page.mouse.move(b.x + b.width * 0.35, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.65, b.y + b.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await expect(readout(page, "Min / max / tích phân scalar")).toHaveText(
    "0.000e+0 / 0.000e+0 / 0.000e+0",
  );
  await page.setViewportSize({ width: 1000, height: 850 });
  await expect(canvas).toBeVisible();
  await page.goto(root + "01-cua-so-va-vet-khoi");
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
});
