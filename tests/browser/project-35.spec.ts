import { expect, test } from "@playwright/test";

const finalRoute = "/projects/shader-hot-reload-lab/10-hoan-thien-shader-gallery";

test("Project 35 has a readable lesson entry, four-effect gallery and complete final source", async ({
  page,
}) => {
  await page.goto("/projects/shader-hot-reload-lab/01-dua-glsl-ra-file-rieng");
  await expect(
    page.getByRole("heading", { name: "Đưa GLSL ra file và phủ kín cửa sổ", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Candidate fragment shader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử bản đã lưu (F5)", exact: true })).toHaveCount(
    0,
  );
  await page.goto(finalRoute);
  await expect(
    page
      .getByRole("heading", { name: "Hoàn thiện gallery và kiểm hot reload", exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel("Hiệu ứng shader").locator("option")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "Toàn bộ mã nguồn của dự án", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("a[href='/downloads/project-35-shader-hot-reload-lab.zip']").first(),
  ).toBeAttached();
});

test("Project 35 separates draft/save/last-good and supports accessible input without pretending to compile GLSL", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByRole("img", {
    name: "Gallery shader: minh họa công thức bằng Canvas 2D",
    exact: true,
  });
  // The readout also exists in SSR. Wait for the actual first Canvas frame so
  // controls cannot be exercised before this client island has hydrated.
  await expect
    .poll(() =>
      canvas.evaluate(
        (element) =>
          (element as HTMLCanvasElement).getContext("2d")?.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const readout = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.locator("dt").filter({ hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  const image = () => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await expect(readout("Ảnh đang chạy")).toContainText("Gradient Aurora");
  await page.getByLabel("Hiệu ứng shader").selectOption("circle");
  await expect(readout("Ảnh đang chạy")).toContainText("Circle Ripples");
  await page.getByLabel("Hiệu ứng shader").selectOption("mandelbrot");
  await expect(readout("Ảnh đang chạy")).toContainText("Mandelbrot");
  await page.getByLabel("Hiệu ứng shader").selectOption("noise");
  await expect(readout("Ảnh đang chạy")).toContainText("Noise Flow");
  await page.getByLabel("Hiệu ứng shader").selectOption("gradient");
  await canvas.focus();
  await canvas.press("n");
  await expect(readout("Uniform snapshot")).toContainText("time 0.03s");
  const originalImage = await image();
  const editor = page.getByLabel("Candidate fragment shader");
  await editor.fill((await editor.inputValue()).replace("SPEED = 0.65", "SPEED = 1.3"));
  await page.getByRole("button", { name: "Thử bản đã lưu (F5)", exact: true }).click();
  await expect(readout("Ảnh đang chạy")).toContainText("SPEED 0.65");
  expect(await image()).toBe(originalImage);
  await page.getByRole("button", { name: "Lưu bản sửa", exact: true }).click();
  await canvas.focus();
  await canvas.press("F5");
  await expect(readout("Ảnh đang chạy")).toContainText("SPEED 1.3");
  await expect(readout("Uniform snapshot")).toContainText("time 0.03s");
  await expect.poll(image).not.toBe(originalImage);

  const lastGood = await image();
  const generation = await readout("Program generation").innerText();
  for (const fault of ["compile", "interface"]) {
    await page
      .getByRole("button", { name: "Thử lỗi " + fault + " (mô phỏng)", exact: true })
      .click();
    await expect(readout("Kết quả gần nhất")).toContainText("vẫn giữ last-good");
    await expect(readout("Program generation")).toHaveText(generation);
    expect(await image()).toBe(lastGood);
  }
  await page.getByRole("button", { name: "Khôi phục mẫu trong editor", exact: true }).click();
  await page.getByRole("checkbox", { name: "Tự thử sau khi lưu (140 ms)", exact: true }).check();
  await page.getByRole("button", { name: "Lưu bản sửa", exact: true }).click();
  await expect(readout("Kết quả gần nhất")).toHaveText("mẫu Canvas đã được áp dụng");
  const attempts = await readout("Reload attempts").innerText();
  await page.waitForTimeout(250);
  await expect(readout("Reload attempts")).toHaveText(attempts);

  await canvas.focus();
  await canvas.press("ArrowRight");
  await canvas.press("+");
  await expect(readout("Uniform snapshot")).toContainText("zoom 1.13");
  const beforeDrag = await readout("Uniform snapshot").innerText();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.6);
  await expect(readout("Mô tả thay thế")).toContainText("đang capture");
  await canvas.press("Escape");
  await page.mouse.up();
  await expect(readout("Uniform snapshot")).toHaveText(beforeDrag);
  await expect(readout("Mô tả thay thế")).toContainText("đã nhả");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy time", exact: true })).toBeDisabled();
  await canvas.focus();
  await canvas.press("n");
  await expect(readout("Uniform snapshot")).toContainText("time 0.07s");
  await page.getByRole("button", { name: "Đặt lại thời gian và con trỏ", exact: true }).click();
  await expect(readout("Uniform snapshot")).toContainText("time 0.00s");
  await expect(readout("Uniform snapshot")).toContainText("zoom 1.00");
});
