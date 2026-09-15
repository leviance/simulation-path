import { expect, test } from "@playwright/test";

test("Project 33 route exposes the CPU/GPU lab and complete source", async ({ page }) => {
  await page.goto("/projects/cpu-gpu-triangle/01-tao-opengl-context-tu-sdl3");
  await expect(page.getByRole("heading", { name: "Tạo OpenGL context từ SDL3" })).toBeVisible();
  const canvas = page.locator("canvas[aria-label*='CPU rasterizer']");
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 260, y: 150 } });
  await canvas.press("KeyN");
  await expect(page.getByText("CPU ↔ RGBA8 GPU")).toBeVisible();

  await page.goto("/projects/cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle");
  await expect(page.getByRole("heading", { name: "Hoàn thiện CPU/GPU Triangle" })).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
