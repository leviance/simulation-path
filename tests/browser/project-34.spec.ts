import { expect, test } from "@playwright/test";

test("Project 34 route exposes renderer switching and complete source", async ({ page }) => {
  await page.goto("/projects/dual-renderer-cube/01-khoa-mot-cube-scene-dung-chung");
  await expect(page.getByRole("heading", { name: "Khóa một CubeScene dùng chung" })).toBeVisible();
  const canvas = page.locator("canvas[aria-label*='khối lập phương']");
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 260, y: 150 } });
  await canvas.press("F2");
  await canvas.press("KeyD");
  await expect(page.getByText("Backend đang active", { exact: false })).toBeVisible();

  await page.goto("/projects/dual-renderer-cube/09-hoan-thien-dual-renderer-cube");
  await expect(page.getByRole("heading", { name: "Hoàn thiện Dual Renderer Cube" })).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
