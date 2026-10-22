import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("dark theme survives client navigation without a light first frame", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("simulation-path-theme", "dark");
    requestAnimationFrame(() => {
      (window as typeof window & { themeAtFirstFrame?: string }).themeAtFirstFrame =
        document.documentElement.dataset.theme;
    });
  });

  await page.goto("/projects/hello-pixels/01-cua-so-va-event-loop");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { themeAtFirstFrame?: string }).themeAtFirstFrame,
      ),
    )
    .toBe("dark");

  await page.getByRole("link", { name: /BÀI TIẾP/ }).click();
  await expect(page).toHaveURL(/02-framebuffer-la-gi$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("homepage keeps a bounded set of illustrated projects", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "30 dự án đã phát hành", exact: true }),
  ).toBeVisible();
  const cards = page.locator(".project-showcase .project-card");
  await expect(cards).toHaveCount(8);
  await expect(page.getByRole("link", { name: /Xem đầy đủ 30 dự án đã phát hành/ })).toBeVisible();

  const glyphsHaveArtwork = await page.locator(".project-glyph").evaluateAll((elements) =>
    elements.every((element) => {
      const before = getComputedStyle(element, "::before");
      return Number.parseFloat(before.width) > 0 && Number.parseFloat(before.height) > 0;
    }),
  );
  expect(glyphsHaveArtwork).toBe(true);
});

test("lesson progress survives reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("simulation-path-progress-v1");
    localStorage.removeItem("simulation-path-progress-v2");
  });
  await page.goto("/projects/hello-pixels/01-cua-so-va-event-loop");

  const completeButton = page.getByRole("button", { name: "Đánh dấu hoàn thành" });
  await expect(completeButton).toHaveAttribute("aria-pressed", "false");
  await completeButton.click();
  await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("search accepts Vietnamese text without diacritics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  await page.getByRole("textbox", { name: "Từ khóa tìm kiếm" }).fill("toa do");

  const result = page.getByRole("link", { name: /Bản đồ tọa độ/ }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/projects\/coordinate-map$/);
});

test("Canvas supports keyboard input, pause and reset", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/hello-pixels/02-framebuffer-la-gi");

  const canvas = page.locator('canvas[aria-label^="Lưới pixel"]');
  await expect(canvas).toBeVisible();
  const readout = page
    .locator(".lab-readout div")
    .filter({ hasText: "Pixel đang chọn" })
    .locator("dd");
  const initial = await readout.textContent();

  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(readout).not.toHaveText(initial ?? "");
  await page.getByRole("button", { name: "Tạm dừng" }).click();
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(readout).toHaveText("(4, 3)");
  expect(errors).toEqual([]);
});

test("Project 09 Transform Lab composes, reorders and drags the square", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/square-transformer/08-hoan-thien-va-kiem-chung");

  const canvas = page.locator('canvas[aria-label^="Hình vuông và hệ cơ sở"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await page.getByLabel("Preset biến đổi", { exact: true }).selectOption("4");
  const controls = page.locator(".lab-controls");
  const worldPoint = page.locator(".lab-readout div").filter({ hasText: "world P2" }).locator("dd");
  const initialPoint = await worldPoint.textContent();

  await controls.getByLabel("Thứ tự").selectOption("rotate-shear-scale");
  await expect(worldPoint).not.toHaveText(initialPoint ?? "");

  await page.getByLabel("scaleX").fill("-1");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "determinant" }).locator("dd"),
  ).toContainText("đảo chiều");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45);
    await page.mouse.up();
  }
  await expect(worldPoint).not.toHaveText(initialPoint ?? "");

  await page.getByRole("button", { name: "Đặt lại identity", exact: true }).click();
  await expect(controls.getByLabel("Thứ tự")).toHaveValue("scale-shear-rotate");
  expect(errors).toEqual([]);
});

test("Project 10 Normal Lab flips winding, keeps perspective and rejects undefined normal", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/3d-compass/07-suy-bien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="La bàn ba trục perspective"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const readout = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  const raw = await readout("raw cross").textContent(),
    area = await readout("area").textContent();
  await page.getByRole("button", { name: "Đảo winding", exact: true }).click();
  await expect(readout("raw cross")).not.toHaveText(raw!);
  await expect(readout("area")).toHaveText(area!);
  await page.getByLabel("Tam giác mẫu", { exact: true }).selectOption("2");
  await expect(readout("unit normal")).toHaveText("Không xác định");
  await expect(readout("normal status")).toContainText("Suy biến");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await canvas.focus();
  await canvas.press("d");
  await expect(readout("camera eye")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Project 11 Projection Lab exposes guarded depth, FOV, keyboard and clean scene", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/perspective-point/08-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Điểm sáng 3D"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const read = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  const preset = page.getByLabel("Điểm mẫu", { exact: true });
  for (const [value, status] of [
    ["3", "behind"],
    ["2", "before-near"],
    ["4", "beyond-far"],
    ["5", "outside"],
    ["0", "visible"],
  ]) {
    await preset.selectOption(value);
    await expect(read("trạng thái")).toHaveText(status);
  }
  const old = await read("pixel").textContent();
  await page.getByLabel("Vertical FOV", { exact: true }).focus();
  await page.getByLabel("Vertical FOV", { exact: true }).press("End");
  await expect(read("pixel")).not.toHaveText(old!);
  await canvas.focus();
  await canvas.press("e");
  await expect(read("world point")).toContainText("4.1000");
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect(read("elapsed")).toHaveText("0.100 s");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("world point")).toHaveText("(1.0000, 0.6000, 4.0000)");
  expect(errors).toEqual([]);
});

test("Project 12 Rotation Lab changes order, owns mouse input and rotates its normal", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/rotating-triangle/08-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Tam giác 3D perspective"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  const read = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Tam giác mẫu", { exact: true }).selectOption("2");
  const normal = await read("unit normal").textContent();
  await page.getByLabel("Rotation order", { exact: true }).selectOption("zyx");
  await expect(read("rotation order")).toHaveText("ZYX");
  await expect(read("unit normal")).not.toHaveText(normal!);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No triangle canvas");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await expect(read("pointer capture")).toHaveText("đang kéo");
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await page.mouse.up();
  await expect(read("pointer capture")).toHaveText("đã nhả");
  for (const label of ["edge-length error", "round-trip error", "normal rotation error"])
    expect(Number(await read(label).textContent())).toBeLessThan(1e-9);
  await canvas.focus();
  await canvas.press("e");
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("rotation order")).toHaveText("XYZ");
  await page.goto("/projects/rotating-triangle/01-noi-ba-diem-thanh-tam-giac-3d");
  await page.getByLabel("Tam giác mẫu", { exact: true }).selectOption("3");
  await expect(read("vertex A")).toHaveText("before-near");
  expect(errors).toEqual([]);
});

test("Project 13 Cube Lab has projection, movement, zoom and recoverable drag", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/wireframe-cube/07-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Cube wireframe"]');
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.locator("dt", { hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  await expect(read("projection cache")).toHaveText("8 kết quả / frame");
  await expect(read("visible edges")).toHaveText("12 / 12");
  expect(Number(await read("max edge error").textContent())).toBeLessThan(1e-9);
  await canvas.focus();
  await page.keyboard.press("p");
  await expect(read("projection")).toHaveText("orthographic");
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  await expect(read("zoom")).not.toHaveText("1.00×");
  await canvas.focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(200);
  await page.keyboard.up("d");
  await expect(read("model position")).not.toHaveText("(0.000, 0.000, 6.000)");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await expect(read("pointer capture")).toHaveText("đang kéo");
    await page.mouse.up();
    await expect(read("pointer capture")).toHaveText("đã nhả");
  }
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("button", { name: "Hiện debug", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("projection")).toHaveText("perspective");
  await expect(read("zoom")).toHaveText("1.00×");
  expect(errors).toEqual([]);
});

test("Project 14 FPS camera has Walk/Fly, bounds, drag and clean scene", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/fps-camera-room/09-hoan-thien-va-kiem-chung");
  const canvas = page.locator('canvas[aria-label^="Căn phòng wireframe"]');
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.locator("dt", { hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  await expect(read("camera position")).toHaveText("(0.000, 1.600, 2.000)");
  expect(Number(await read("basis error").textContent())).toBeLessThan(1e-9);
  await page.getByLabel("FPS thí nghiệm", { exact: true }).selectOption("30");
  await page.getByRole("button", { name: "Đi W trong 1 giây", exact: true }).click();
  await expect(read("camera position")).toHaveText("(0.000, 1.600, 5.500)");
  await page.getByRole("button", { name: "Mode: Walk", exact: true }).click();
  await expect(read("movement mode")).toHaveText("Fly");
  await page.getByRole("button", { name: "Bước E 0.1 s", exact: true }).click();
  await expect(read("camera position")).toHaveText("(0.000, 1.950, 5.500)");
  await page.getByLabel("Wall margin", { exact: true }).fill("1");
  await page.getByLabel("Camera X", { exact: true }).fill("5.65");
  await expect(read("room bounds")).toHaveText("bên trong");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await expect(read("pointer capture")).toHaveText("đang nhìn");
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
    await page.mouse.up();
    await expect(read("pointer capture")).toHaveText("đã nhả");
  }
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("button", { name: "Hiện debug", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("camera position")).toHaveText("(0.000, 1.600, 2.000)");
  await expect(read("movement mode")).toHaveText("Walk");
  expect(errors).toEqual([]);
});

test("Project 15 rebuilt inspector exposes all stages, lens controls and safe capture", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/3d-pipeline-inspector/07-ghep-mvp-va-validation");
  const canvas = page.locator('canvas[aria-label^="Máy soi pipeline 3D"]'),
    controls = page.locator(".lab-controls");
  const readout = (label: string) =>
    page.locator(".lab-readout div").filter({ hasText: label }).locator("dd");
  await expect(canvas).toBeVisible();
  await controls.getByLabel("Pipeline preset").selectOption("1");
  await expect(readout("WORLD")).toHaveText("(1.00000, 1.00000, 4.00000, 1.00000)");
  await expect(readout("SCREEN")).toHaveText("(550.00000, 210.00000)");
  await expect(readout("MVP agreement error")).not.toContainText("invalid");
  const world = await readout("WORLD").textContent();
  await controls.getByLabel("Far plane", { exact: true }).fill("8");
  await expect(readout("WORLD")).toHaveText(world!);
  await controls.getByLabel("Pipeline preset").selectOption("3");
  await expect(readout("NDC")).toContainText("—");
  await expect(readout("SCREEN")).toContainText("—");
  await controls.getByLabel("Pipeline preset").selectOption("6");
  await expect(readout("NDC")).toContainText("—");
  await controls.getByLabel("Pipeline preset").selectOption("0");
  await expect(controls.getByLabel("Thao tác kéo", { exact: true })).toHaveValue("model");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(readout("pointer capture")).toHaveText("đang kéo");
    await canvas.press("r");
    await expect(readout("pointer capture")).toHaveText("đã nhả");
    await page.mouse.up();
    const cameraYaw = await controls.getByLabel("Camera yaw", { exact: true }).inputValue();
    const cameraPitch = await controls.getByLabel("Camera pitch", { exact: true }).inputValue();
    const modelYaw = await controls.getByLabel("Model yaw", { exact: true }).inputValue();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await expect(controls.getByLabel("Model yaw", { exact: true })).not.toHaveValue(modelYaw);
    await expect(controls.getByLabel("Camera yaw", { exact: true })).toHaveValue(cameraYaw);
    await expect(controls.getByLabel("Camera pitch", { exact: true })).toHaveValue(cameraPitch);
    await controls.getByLabel("Thao tác kéo", { exact: true }).selectOption("view");
    const rotatedModelYaw = await controls.getByLabel("Model yaw", { exact: true }).inputValue();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const fixedWorld = await readout("WORLD").textContent();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await expect(readout("WORLD")).toHaveText(fixedWorld!);
    await expect(controls.getByLabel("Model yaw", { exact: true })).toHaveValue(rotatedModelYaw);
    await expect(controls.getByLabel("Camera yaw", { exact: true })).not.toHaveValue(cameraYaw);
    await expect(controls.getByLabel("Camera pitch", { exact: true })).not.toHaveValue(cameraPitch);
  }
  await controls.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await controls.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await controls.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(readout("WORLD")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Project 16 Triangle Raster Lab drags vertices, steps candidates and switches fill rules", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/triangle-rasterizer/07-barycentric-va-validation");

  const canvas = page.locator('canvas[aria-label^="Lưới raster tam giác"]');
  const controls = page.locator(".lab-controls");
  const candidate = page.locator(".lab-readout div").filter({ hasText: "Candidate" }).locator("dd");
  const tested = page
    .locator(".lab-readout div")
    .filter({ hasText: "Tested / covered" })
    .locator("dd");
  const winding = page.locator(".lab-readout div").filter({ hasText: "Winding" }).locator("dd");

  await expect(canvas).toBeVisible();
  await expect(candidate).toContainText("pixel");
  await expect(winding).toContainText("positive");

  await controls.getByLabel("Tình huống tam giác").selectOption("reversed");
  await expect(winding).toContainText("negative");
  await controls.getByLabel("Tình huống tam giác").selectOption("shared");
  await controls.getByLabel("Quy tắc tô cạnh").selectOption("inclusive");
  await expect(controls.getByLabel("Quy tắc tô cạnh")).toHaveValue("inclusive");
  await controls.getByLabel("Quy tắc tô cạnh").selectOption("top-left");
  await controls.getByLabel("Cách tô màu tam giác").selectOption("solid");
  await expect(controls.getByLabel("Cách tô màu tam giác")).toHaveValue("solid");

  await page.getByRole("button", { name: "Tiến một pixel" }).click();
  await expect(tested).toContainText("1/");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Quy tắc tô cạnh")).toHaveValue("top-left");
  await expect(controls.getByLabel("Cách tô màu tam giác")).toHaveValue("barycentric");
  await controls.getByLabel("Tình huống tam giác").selectOption("normal");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const cell = Math.max(10, Math.floor(Math.min((box.width - 40) / 24, (box.height - 40) / 16)));
    const left = (box.width - cell * 24) / 2;
    const top = (box.height - cell * 16) / 2;
    await page.mouse.move(box.x + left + 12 * cell, box.y + top + 2 * cell);
    await page.mouse.down();
    await page.mouse.move(box.x + left + 14 * cell, box.y + top + 4 * cell);
    await page.mouse.up();
  }
  await expect(controls.getByLabel("Tình huống tam giác")).toHaveValue("custom");
  expect(errors).toEqual([]);
});

test("Project 17 Z-buffer Lab keeps the image independent from draw order", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/solid-cube-z-buffer/07-kiem-chung-doc-lap-draw-order");

  const canvas = page.locator('canvas[aria-label^="Khối lập phương sáu mặt màu"]');
  const controls = page.locator(".lab-controls");
  const difference = page
    .locator(".lab-readout div")
    .filter({ hasText: "Chênh lệch khi đảo order" })
    .locator("dd");
  const fragments = page
    .locator(".lab-readout div")
    .filter({ hasText: "Fragment pass / reject" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await controls.getByLabel("Góc nhìn cube").selectOption("3");
  await expect(difference).toHaveText("0 color · 0 depth");
  await expect(fragments).toHaveText(/\d+ \/ \d+/);

  await controls.getByLabel("Depth test").uncheck();
  await expect(difference).not.toHaveText("0 color · 0 depth");
  await controls.getByLabel("Đảo draw order").check();
  await controls.getByLabel("Xem depth").check();

  await controls.getByLabel("Depth test").check();
  await expect(difference).toHaveText("0 color · 0 depth");
  await page.getByRole("button", { name: /Tạm dừng|Cho cube quay/ }).click();
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(difference).toHaveText("0 color · 0 depth");
  expect(errors).toEqual([]);
});

test("Project 18 Near-plane Lab clips topology, compares discard and captures pointer", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/near-plane-clipper/07-sweep-qua-camera-va-validation");

  const canvas = page.locator('canvas[aria-label^="Mặt cắt camera space"]');
  const controls = page.locator(".lab-controls");
  const counts = page
    .locator(".lab-readout div")
    .filter({ hasText: "Inside / outside / on" })
    .locator("dd");
  const topology = page
    .locator(".lab-readout div")
    .filter({ hasText: "Polygon → triangle" })
    .locator("dd");
  const pixels = page
    .locator(".lab-readout div")
    .filter({ hasText: "Pixels / violation" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await controls.getByLabel("Tình huống near-plane clipping").selectOption("one-out");
  await expect(counts).toHaveText("2 / 1 / 0");
  await expect(topology).toHaveText("4 → 2");
  await expect(pixels).not.toHaveText(/^0 \/ /);

  await controls.getByLabel("Cách xử lý triangle cắt near plane").selectOption("discard");
  await expect(pixels).toHaveText(/^0 \/ /);
  await controls.getByLabel("Cách xử lý triangle cắt near plane").selectOption("clip");
  await expect(pixels).not.toHaveText(/^0 \/ /);

  await controls.getByLabel("Tình huống near-plane clipping").selectOption("outside");
  await expect(counts).toHaveText("0 / 3 / 0");
  await expect(topology).toHaveText("0 → 0");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(topology).toHaveText("0 → 0");
  expect(errors).toEqual([]);
});

test("Project 19 Lambert Lab changes light, material and model without browser errors", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/lambert-tetrahedron/07-ghep-pipeline-va-kiem-chung");

  const canvas = page.locator('canvas[aria-label^="Tetrahedron flat-shaded"]');
  const controls = page.locator(".lab-controls");
  const dotDiffuse = page
    .locator(".lab-readout div")
    .filter({ hasText: "dot → diffuse" })
    .locator("dd");
  const intensity = page.locator(".lab-readout div").filter({ hasText: "Intensity" }).locator("dd");
  const visible = page
    .locator(".lab-readout div")
    .filter({ hasText: "Visible / culled" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(dotDiffuse).toContainText("→");
  await expect(visible).toHaveText(/[1-3] \/ [1-3]/);

  const initialIntensity = await intensity.textContent();
  await controls.getByLabel("Preset hướng đèn").selectOption("back");
  await expect(intensity).not.toHaveText(initialIntensity ?? "");
  await controls.getByLabel("Face đang theo dõi").selectOption("2");
  await controls.getByLabel("Cường độ ambient").fill("0.3");
  await expect(controls.getByLabel("Cường độ ambient")).toHaveValue("0.3");
  await controls.getByLabel("Cường độ diffuse").fill("0.6");
  await expect(controls.getByLabel("Cường độ diffuse")).toHaveValue("0.6");

  await page.getByRole("button", { name: /Lighting/ }).click();
  await page.getByRole("button", { name: /Normal/ }).click();
  await page.getByRole("button", { name: "Tiến một bước" }).click();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.48);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.56);
    await page.mouse.up();
  }

  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Preset hướng đèn")).toHaveValue("front");
  await expect(controls.getByLabel("Face đang theo dõi")).toHaveValue("0");
  expect(errors).toEqual([]);
});

test("Project 20 Perspective Texture Lab compares UV paths and keeps controls responsive", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/perspective-checkerboard/08-ghep-texture-mapper-va-validation");

  const canvas = page.locator('canvas[aria-label^="Quad nghiêng với texture affine"]');
  const controls = page.locator(".lab-controls");
  const affine = page.locator(".lab-readout div").filter({ hasText: "Affine UV" }).locator("dd");
  const corrected = page
    .locator(".lab-readout div")
    .filter({ hasText: "Corrected UV" })
    .locator("dd");
  const denominator = page
    .locator(".lab-readout div")
    .filter({ hasText: "1/z denominator / error" })
    .locator("dd");
  const texel = page.locator(".lab-readout div").filter({ hasText: "Texel" }).locator("dd");

  await expect(canvas).toBeVisible();
  await expect(affine).toContainText("(");
  await expect(corrected).toContainText("(");
  await expect(denominator).toContainText("/");
  await expect(texel).toContainText("clamp");

  await controls.getByLabel("Độ nghiêng của quad texture").selectOption("near");
  await expect(affine).not.toHaveText("—");
  await expect(corrected).not.toHaveText("—");
  await expect(denominator).not.toHaveText("—");

  await controls.getByLabel("Độ nghiêng của quad texture").selectOption("steep");
  await controls.getByLabel("Cách nội suy texture").selectOption("affine");
  await expect(controls.getByLabel("Cách nội suy texture")).toHaveValue("affine");
  await controls.getByLabel("Cách nội suy texture").selectOption("compare");
  await controls.getByLabel("Texture address mode").selectOption("repeat");
  await expect(texel).toContainText("repeat");
  await controls.getByLabel("Độ sâu cạnh xa").fill("7.5");
  await expect(controls.getByLabel("Độ sâu cạnh xa")).toHaveValue("7.5");

  await page.getByRole("button", { name: "Tiến một bước" }).click();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.56);
    await page.mouse.up();
  }

  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Độ nghiêng của quad texture")).toHaveValue("medium");
  await expect(controls.getByLabel("Cách nội suy texture")).toHaveValue("compare");
  await expect(controls.getByLabel("Texture address mode")).toHaveValue("clamp");

  const finalHeader = page
    .locator(".checkpoint-source .source-file")
    .filter({ hasText: "include/lab.hpp" });
  await finalHeader.locator("summary").click();
  await expect(finalHeader.locator('[data-theme="one-dark-pro"]')).toBeVisible();
  await expect(finalHeader).toContainText("interpolatePerspectiveUv");
  expect(errors).toEqual([]);
});
