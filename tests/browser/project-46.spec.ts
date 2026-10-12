import { expect, test } from "@playwright/test";

test("Project 46 gates lessons, paints by keyboard, steps, resets and validates", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/falling-sand/01-ve-luoi-vat-lieu");
  await expect(page.getByRole("button", { name: "Tiến một tick" })).toBeDisabled();
  await expect(page.getByLabel("Vật liệu", { exact: true })).toHaveCount(0);
  await page.goto("/projects/falling-sand/07-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Cảnh mẫu", { exact: true }).selectOption("2");
  await page.getByRole("slider", { name: /Bán kính bút/ }).press("Home");
  const canvas = page.getByLabel("Hộp cát ô lưới", { exact: true });
  await canvas.focus();
  await canvas.press("Enter");
  await expect(readout("Số ô cát / nước")).toHaveText("1 / 0");
  await page.getByRole("button", { name: "Tiến một tick" }).click();
  await expect(readout("Tick")).toHaveText("1");
  await expect(readout("Số ô cát / nước")).toHaveText("1 / 0");
  await page.getByRole("button", { name: "Kiểm chứng cảnh chuẩn" }).click();
  await expect(readout("Kiểm chứng 120 tick")).toContainText("Bảo toàn: PASS");
  await expect(readout("Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout("Tick")).toHaveText("0");
  await expect(readout("Số ô cát / nước")).toHaveText("0 / 0");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
