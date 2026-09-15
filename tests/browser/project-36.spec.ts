import { expect, test } from "@playwright/test";

test("Project 36 exposes stage-aware ray marching and complete source", async ({ page }) => {
  await page.goto("/projects/ray-marched-shape-room/04-sphere-tracing-co-guard");
  await expect(
    page.getByRole("heading", { name: "Cho tia tiến từng bước và dừng an toàn" }),
  ).toBeVisible();
  await expect(page.getByLabel("Maximum steps: 96")).toBeVisible();
  await expect(page.getByText("camera samples", { exact: false })).toBeVisible();

  await page.goto("/projects/ray-marched-shape-room/09-hoan-thien-can-phong-ray-march");
  await expect(
    page.getByRole("heading", { name: "Hoàn thiện căn phòng ray-marched" }),
  ).toBeVisible();
  await expect(page.getByText("Kết quả kiểm tra")).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
