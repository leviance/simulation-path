import { expect, test } from "@playwright/test";

test("Project 37 exposes dispatch-tail controls and complete source", async ({ page }) => {
  await page.goto("/projects/million-vector-gpu/05-dispatch-hon-mot-trieu-vector");
  await expect(
    page.getByRole("heading", { name: "Chạy phép tính trên hơn một triệu vector" }),
  ).toBeVisible();
  await expect(page.getByLabel("Số phần tử")).toBeVisible();
  await expect(page.getByText("189 lane dư", { exact: false })).toBeVisible();

  await page.goto("/projects/million-vector-gpu/09-hoan-thien-may-tinh-vector-gpu");
  await expect(page.getByRole("heading", { name: "Hoàn thiện máy tính vector GPU" })).toBeVisible();
  await expect(page.getByText("Kết quả kiểm tra")).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
