import { expect, test } from "@playwright/test";
test("Project 49 steps the worked Jacobi stencil without advancing velocity or scalar", async ({
  page,
}) => {
  await page.goto("/projects/stable-fluids/05-pressure-poisson");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("dipole");
  await page.getByRole("button", { name: "Tiến một vòng Jacobi", exact: true }).click();
  await expect(readout("RHS ô đang chọn")).toHaveText("64.000000");
  await expect(readout("Pressure cũ / candidate / sau blend")).toHaveText(
    "0.000000 / 0.250000 / 0.187500",
  );
  await expect(readout("Mean đã trừ / pressure kết quả")).toHaveText("0.000000000 / 0.187500000");
  await expect(readout("Tick")).toHaveText("0");
  await expect(readout("Concentration")).toHaveText("0.000000");
  const before = await readout("u trái / phải").textContent();
  await page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true }).press("j");
  await expect(readout("Mean đã trừ / pressure kết quả")).toHaveText("0.000000000 / 0.199218750");
  await expect(readout("u trái / phải")).toHaveText(before!);
  await page.getByRole("button", { name: "Bắt đầu lại pressure", exact: true }).click();
  await expect(readout("Số vòng Jacobi đã chạy")).toHaveText("0");
  await expect(readout("Tick")).toHaveText("0");
});
test("Project 49 gates the solver, supports keyboard input and validates independently", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/stable-fluids/01-ve-khoi-tren-luoi");
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeDisabled();
  await expect(page.getByLabel("Bút", { exact: true })).toHaveCount(0);
  await page.goto("/projects/stable-fluids/11-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("empty");
  const canvas = page.getByLabel("Mô phỏng khói Stable Fluids", { exact: true });
  await canvas.press("Enter");
  await expect(readout("Concentration")).toHaveText("1.000000");
  await canvas.press("w");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(readout("Tick")).toHaveText("1");
  await expect(readout("Lần projection gần nhất: trước / sau")).not.toHaveText("Chưa có");
  await page.getByRole("button", { name: "Kiểm chứng ca chuẩn" }).click();
  await expect(readout("Ca chuẩn riêng")).toContainText("PASS");
  await expect(readout("Tick")).toHaveText("1");
  await page.getByLabel("Vòng lặp pressure", { exact: true }).selectOption("40");
  await expect(readout("Tick")).toHaveText("1");
  await page.getByLabel("Độ phân giải", { exact: true }).selectOption("32");
  await expect(readout("Tick")).toHaveText("0");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(page.getByLabel("Vòng lặp pressure", { exact: true })).toHaveValue("160");
  await expect(page.getByLabel("Độ phân giải", { exact: true })).toHaveValue("24");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
