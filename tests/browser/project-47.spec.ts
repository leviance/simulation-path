import { expect, test } from "@playwright/test";

test("Project 47 gates controls, paints a pulse, rejects unsafe dt and validates independently", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/heat-plate/01-ve-ban-do-nhiet");
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeDisabled();
  await expect(page.getByLabel("Bút nhiệt", { exact: true })).toHaveCount(0);
  await page.goto("/projects/heat-plate/08-kiem-chung-va-ban-hoan-chinh");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("3");
  await page.getByRole("slider", { name: /Bán kính/ }).press("Home");
  const canvas = page.getByLabel("Tấm kim loại dẫn nhiệt", { exact: true });
  await canvas.press("Enter");
  await expect(readout("Tổng θ")).toHaveText("1.000000000");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(readout("Nhiệt độ θ")).toHaveText("0.200000");
  await expect(readout("Tick")).toHaveText("1");
  await page.getByLabel("Hệ số khuếch tán α", { exact: true }).selectOption("12");
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Không chạy" })).toBeVisible();
  await expect(readout("Tick")).toHaveText("1");
  await page.getByLabel("Bước thời gian", { exact: true }).selectOption(String(1 / 60));
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeEnabled();
  await page.getByRole("button", { name: "Kiểm chứng tấm chuẩn" }).click();
  await expect(readout("Kiểm chứng")).toContainText("Biên lạnh: PASS");
  await expect(readout("Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout("Tick")).toHaveText("0");
  await expect(readout("Tổng θ")).toHaveText("0.000000000");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
