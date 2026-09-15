import { expect, test } from "@playwright/test";

test("Project 35 route exposes the shader editor and complete source", async ({ page }) => {
  await page.goto("/projects/shader-hot-reload-lab/01-dua-glsl-ra-file-rieng");
  await expect(page.getByRole("heading", { name: "Đưa GLSL ra file riêng" })).toBeVisible();
  const editor = page.getByLabel("Candidate fragment shader");
  await expect(editor).toBeVisible();
  await page.getByRole("button", { name: "Chèn lỗi compile" }).click();
  await expect(page.getByText("thất bại — vẫn giữ last-good", { exact: false })).toBeVisible();

  await page.goto("/projects/shader-hot-reload-lab/08-hoan-thien-shader-hot-reload-lab");
  await expect(
    page.getByRole("heading", { name: "Hoàn thiện Shader Hot Reload Lab" }),
  ).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
