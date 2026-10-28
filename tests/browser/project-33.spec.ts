import { expect, test } from "@playwright/test";

test("Project 33 route exposes the CPU/GPU lab and complete source", async ({ page }) => {
  await page.goto("/projects/cpu-gpu-triangle/01-tao-opengl-context-tu-sdl3");
  await expect(
    page.locator(".lesson-hero").getByRole("heading", { name: "Tạo OpenGL context từ SDL3" }),
  ).toBeVisible();
  const canvas = page.locator("canvas[aria-label*='CPU rasterizer']");
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tiến 10°", exact: true })).toBeDisabled();
  await canvas.click({ position: { x: 260, y: 150 } });
  await canvas.press("KeyN");
  await expect(page.getByText("CPU ↔ RGBA8 mô phỏng")).toBeVisible();

  await page.goto("/projects/cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle");
  await expect(
    page
      .locator(".lesson-hero")
      .getByRole("heading", { name: "Hoàn thiện ứng dụng đối chiếu CPU và GPU" }),
  ).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});

test("Project 33 Canvas preserves probe capture, step, reset and reduced motion", async ({
  page,
}) => {
  await page.goto("/projects/cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle");
  const canvas = page.locator("canvas[aria-label*='CPU rasterizer']");
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width))
    .toBeGreaterThan(300);
  await canvas.scrollIntoViewIfNeeded();
  const angle = page.getByRole("slider", { name: /Góc xoay/ });
  await canvas.press("n");
  await expect(angle).toHaveValue("10");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(angle).toHaveValue("0");
  await page.getByRole("checkbox", { name: "Nội suy màu" }).check();
  await page.getByRole("combobox", { name: "Hiển thị" }).selectOption("difference");
  const readout = page
    .getByText("Probe NDC / coverage", { exact: true })
    .locator("..")
    .locator("dd");
  const before = await readout.innerText();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.5);
  await expect(readout).not.toHaveText(before);
  await canvas.press("Escape");
  await page.mouse.up();
  await expect(readout).toHaveText(before);
  await expect.poll(() => canvas.evaluate((element) => element.hasPointerCapture(1))).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến 10°", exact: true }).click();
  await expect(angle).toHaveValue("10");
  await canvas.focus();
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});
