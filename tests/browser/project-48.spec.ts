import { expect, test } from "@playwright/test";
test("Project 48 shows known derivatives, gates controls and keeps reference validation independent", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/wind-map/01-ve-luoi-mui-ten");
  await expect(page.getByRole("button", { name: "Tiến một bước" })).toBeDisabled();
  await expect(page.getByLabel("Trường mẫu", { exact: true })).toBeDisabled();
  await page.goto("/projects/wind-map/09-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Trường mẫu", { exact: true }).selectOption("source");
  await expect(readout("Divergence")).toHaveText("2.000000");
  await expect(readout("Curl z")).toHaveText("0.000000");
  await page.getByLabel("Trường mẫu", { exact: true }).selectOption("shear");
  await expect(readout("Curl z")).toHaveText("-1.000000");
  await page.getByLabel("Trường mẫu", { exact: true }).selectOption("rotation");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(readout("Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Kiểm chứng trường chuẩn" }).click();
  await expect(readout("Kiểm chứng")).toContainText("PASS");
  await expect(readout("Tick")).toHaveText("1");
  const canvas = page.getByLabel("Bản đồ trường vector", { exact: true });
  await canvas.press("ArrowRight");
  await canvas.press("Enter");
  await expect(page.getByRole("checkbox", { name: "Xoáy cục bộ" })).toBeChecked();
  await expect(readout("Tick")).toHaveText("0");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(page.getByRole("checkbox", { name: "Xoáy cục bộ" })).not.toBeChecked();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
