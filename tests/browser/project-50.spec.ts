import { expect, test } from "@playwright/test";
test("SPH isolated pair exposes pressure balance and viscosity power using keyboard-accessible controls", async ({
  page,
}) => {
  await page.goto("/projects/sph-water/06-artificial-viscosity");
  await page.getByLabel("Thí nghiệm", { exact: true }).selectOption("pair");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(readout("Pressure A / B")).toHaveText("14400.000000 / 28800.000000");
  await expect(readout("Tổng lực nội")).toHaveText("(0.000000; 0.000000)");
  await expect(readout("Công suất viscosity")).toHaveText("-3.609163494");
  await page.getByLabel("Chuyển động tương đối", { exact: true }).selectOption("separate");
  await expect(readout("Pi của cặp")).toHaveText("0.000000000");
  await expect(readout("Công suất viscosity")).toHaveText("0.000000000");
  await expect(readout("Lực pressure A / B")).toContainText("-211.561054");
  await page.getByLabel("Density A", { exact: true }).selectOption("900");
  await page.getByLabel("Density B", { exact: true }).selectOption("900");
  await expect(readout("Pressure A / B")).toHaveText("0.000000 / 0.000000");
  await page.getByRole("button", { name: "Đặt lại cặp hạt", exact: true }).click();
  await expect(readout("Công suất viscosity")).toHaveText("-3.609163494");
});
test("SPH gates stages, emits with keyboard and validates without changing the visible state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/sph-water/01-ve-hat-va-be-nuoc");
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Đổ một hạt" })).toHaveCount(0);
  await page.goto("/projects/sph-water/10-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("empty");
  const canvas = page.getByLabel("Mô phỏng nước SPH 2D", { exact: true });
  await canvas.press("Enter");
  await expect(readout("Số hạt / khối lượng")).toHaveText("1 / 2.0250 kg");
  await canvas.press("Enter");
  await expect(readout("Đổ thành công / từ chối")).toHaveText("1 / 1");
  await canvas.press("ArrowRight");
  await canvas.press("Enter");
  await expect(readout("Số hạt / khối lượng")).toHaveText("2 / 4.0500 kg");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  const time = await readout("Thời gian mô phỏng").textContent();
  await page.getByRole("button", { name: "Kiểm chứng ca chuẩn" }).click();
  await expect(page.getByRole("status")).toContainText("PASS");
  await expect(readout("Thời gian mô phỏng")).toHaveText(time!);
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout("Thời gian mô phỏng")).toHaveText("0.000000 s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
