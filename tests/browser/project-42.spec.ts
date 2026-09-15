import { expect, test } from "@playwright/test";

test("Project 42 exposes deterministic presets, stepping and bounded validation", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/projects/molecular-dynamics-cpu/01-xep-1000-hat-vao-hop");
  await expect(
    page.getByRole("heading", { name: "Xếp 1.000 hạt vào hộp mà không chồng lấn" }).first(),
  ).toBeVisible();
  const particleCount = page
    .locator(".lab-readout div")
    .filter({ hasText: "Số hạt N" })
    .locator("dd");
  await expect(particleCount).toHaveText("1.000");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "Số cặp / một lần tính lực" }).locator("dd"),
  ).toHaveText("499.500");

  await page.goto("/projects/molecular-dynamics-cpu/05-tich-phan-va-phan-xa-o-thanh-hop");
  const elapsed = page
    .locator(".lab-readout div")
    .filter({ hasText: "Thời gian / số bước" })
    .locator("dd");
  await expect(elapsed).toContainText("0.0000 / 0");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(elapsed).not.toContainText("0.0000 / 0");

  await page.goto("/projects/molecular-dynamics-cpu/08-hoan-thien-cpu-molecular-dynamics-lab");
  await expect(
    page.getByText("Toàn bộ mã nguồn của dự án", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kiểm chứng mô hình chuẩn" }).click();
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "Kiểm chứng" }).locator("dd"),
  ).toContainText("PASS");
  await expect(pageErrors).toEqual([]);
});
