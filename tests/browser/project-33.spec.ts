import { expect, test } from "@playwright/test";

test("Project 33 overview shows the real C++ result alongside the interactive reference scene", async ({
  page,
}) => {
  await page.goto("/projects/cpu-gpu-triangle");
  const demo = page.locator(".project-demo");
  const still = demo.locator("img[src$='/cpu-gpu-triangle/project-16-reference.png']");
  await still.scrollIntoViewIfNeeded();
  await expect
    .poll(() => still.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBe(1120);
  await expect(demo.getByRole("checkbox", { name: "Nội suy màu" })).toBeChecked();
});

test("Project 33 opens and resets to the P16 silhouette and vertex colors in both panels", async ({
  page,
}) => {
  await page.goto("/projects/cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle");
  const canvas = page.locator("canvas[aria-label*='CPU rasterizer']");
  const smooth = page.getByRole("checkbox", { name: "Nội suy màu" });
  await expect(smooth).toBeEnabled();
  await expect(smooth).toBeChecked();
  const still = page.locator("img[src$='/cpu-gpu-triangle/project-16-reference.png']").first();
  await still.scrollIntoViewIfNeeded();
  await expect
    .poll(() => still.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBe(1120);

  const colorMismatches = () =>
    canvas.evaluate((element) => {
      const surface = element as HTMLCanvasElement;
      const box = surface.getBoundingClientRect();
      const w = Math.floor((box.width - 52) / 2),
        h = box.height - 94;
      const focal = Math.min(h, 1.5 * w) / (2 * Math.tan(Math.PI / 6));
      // Use P16 world coordinates and its camera, not coordinates from the P33 lab.
      const vertices = [
        [-1.4, 1.2, 4],
        [1.6, -1, 5.5],
        [-1.4, -1, 6.5],
      ].map(([x, y, z]) => [w / 2 + (focal * x) / z, h / 2 - (focal * y) / z]);
      const ctx = surface.getContext("2d")!;
      const dprX = surface.width / box.width,
        dprY = surface.height / box.height;
      const mismatches = [];
      for (const origin of [18, 18 + w + 16]) {
        for (let i = 0; i < 3; i++) {
          const weights = [0.09, 0.09, 0.09];
          weights[i] = 0.82;
          const x = origin + vertices.reduce((sum, v, k) => sum + weights[k] * v[0], 0);
          const y = 30 + vertices.reduce((sum, v, k) => sum + weights[k] * v[1], 0);
          const rgb = ctx.getImageData(Math.floor(x * dprX), Math.floor(y * dprY), 1, 1).data;
          if (!weights.every((value, channel) => Math.abs(rgb[channel] - value * 255) <= 9))
            mismatches.push({
              vertex: "ABC"[i],
              origin,
              x,
              y,
              measured: [...rgb],
              size: [box.width, box.height, surface.width, surface.height],
            });
        }
      }
      return mismatches;
    });
  await expect.poll(colorMismatches).toEqual([]);
  await smooth.uncheck();
  await expect.poll(colorMismatches).toHaveLength(6);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(smooth).toBeChecked();
  await page.setViewportSize({ width: 820, height: 880 });
  await expect.poll(colorMismatches).toEqual([]);
});

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

test("Project 33 presets, pixel-center model and pointer ownership stay explicit", async ({
  page,
}) => {
  await page.goto("/projects/cpu-gpu-triangle/08-doc-lai-gpu-va-do-sai-khac");
  const canvas = page.locator("canvas[aria-label*='CPU rasterizer']");
  await expect(canvas).toBeVisible();
  const preset = page.getByRole("combobox", { name: "Mẫu thử", exact: true });
  await expect(preset).toBeEnabled();
  await preset.selectOption("rotated");
  await expect(page.getByRole("slider", { name: /Góc xoay/ })).toHaveValue("45");
  await preset.selectOption("outside");
  const gutterIsClear = await canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const css = canvas.getBoundingClientRect();
    const ratio = canvas.width / css.width;
    const panelWidth = Math.floor((css.width - 52) / 2);
    const x = Math.round((18 + panelWidth + 8) * ratio);
    const context = canvas.getContext("2d")!;
    const pixels = context.getImageData(
      x,
      Math.ceil(40 * ratio),
      1,
      Math.floor((css.height - 140) * ratio),
    ).data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset] !== 8 || pixels[offset + 1] !== 13 || pixels[offset + 2] !== 25)
        return false;
    }
    return true;
  });
  expect(gutterIsClear).toBe(true);
  await expect(page.getByText("CPU ↔ RGBA8 mô phỏng").locator("..").locator("dd")).toContainText(
    "không tạo fragment",
  );
  await expect(page.getByText("Tâm pixel được chọn (mô hình)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(preset).toHaveValue("default");
  const readout = page
    .getByText("Probe NDC / coverage", { exact: true })
    .locator("..")
    .locator("dd");
  await canvas.focus();
  const before = await readout.innerText();
  await canvas.press("ArrowRight");
  await expect(readout).not.toHaveText(before);
  const after = await readout.innerText();
  await canvas.dispatchEvent("pointermove", {
    pointerId: 99,
    clientX: 50,
    clientY: 50,
    isPrimary: false,
  });
  await expect(readout).toHaveText(after);
  await expect(page.getByText("không đo sai khác CPU/GPU thật", { exact: false })).toBeVisible();
  const source = page
    .locator(".checkpoint-source details.source-file")
    .filter({
      has: page.locator("summary code").filter({ hasText: "include/gpu_renderer.hpp" }),
    })
    .first();
  await source.locator("summary").click();
  await expect(source.locator(".highlighted-code")).toContainText("readGpuProbe");
  await page.goto("/projects/cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle");
  await expect(
    page.locator("a[href='/downloads/project-33-cpu-gpu-triangle.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
