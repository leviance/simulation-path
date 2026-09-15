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
  await page.goto("/projects/square-transformer/06-thu-tu-phep-bien-doi-va-validation");

  const canvas = page.locator('canvas[aria-label^="Hình vuông sau biến đổi"]');
  await expect(canvas).toBeVisible();
  const controls = page.locator(".lab-controls");
  const worldPoint = page.locator(".lab-readout div").filter({ hasText: "world P2" }).locator("dd");
  const initialPoint = await worldPoint.textContent();

  await controls.getByLabel("Thứ tự").selectOption("rotate-shear-scale");
  await expect(worldPoint).not.toHaveText(initialPoint ?? "");

  await page.getByLabel("scaleX").fill("-1");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "determinant" }).locator("dd"),
  ).toContainText("đã phản chiếu");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45);
    await page.mouse.up();
  }
  await expect(worldPoint).not.toHaveText(initialPoint ?? "");

  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Thứ tự")).toHaveValue("scale-shear-rotate");
  expect(errors).toEqual([]);
});

test("Project 10 Normal Lab flips winding and handles a degenerate triangle", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/3d-compass/06-tam-giac-suy-bien-va-validation");

  const canvas = page.locator('canvas[aria-label^="La bàn ba trục"]');
  await expect(canvas).toBeVisible();
  const controls = page.locator(".lab-controls");
  const rawNormal = page
    .locator(".lab-readout div")
    .filter({ hasText: "raw normal" })
    .locator("dd");
  const area = page.locator(".lab-readout div").filter({ hasText: "diện tích" }).locator("dd");
  const initialNormal = await rawNormal.textContent();
  const initialArea = await area.textContent();

  await page.getByRole("button", { name: "Đảo B ↔ C" }).click();
  await expect(rawNormal).not.toHaveText(initialNormal ?? "");
  await expect(area).toHaveText(initialArea ?? "");

  const preset = controls.locator("label").filter({ hasText: "Preset" }).locator("select");
  await preset.selectOption("line");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "unit normal" }).locator("dd"),
  ).toContainText("không xác định");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "validation" }).locator("dd"),
  ).toContainText("degenerate");

  await page.getByRole("button", { name: "Đặt lại" }).click();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.51, box.y + box.height * 0.26);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.32);
    await page.mouse.up();
  }
  expect(errors).toEqual([]);
});

test("Project 11 Projection Lab exposes visibility, FOV, keyboard and inverse drag", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/perspective-point/06-diem-bay-va-validation");

  const canvas = page.locator('canvas[aria-label^="Projection pipeline"]');
  await expect(canvas).toBeVisible();
  const controls = page.locator(".lab-controls");
  const status = page.locator(".lab-readout div").filter({ hasText: "trạng thái" }).locator("dd");
  const pixel = page.locator(".lab-readout div").filter({ hasText: "pixel" }).locator("dd");
  const worldPoint = page
    .locator(".lab-readout div")
    .filter({ hasText: "world point" })
    .locator("dd");

  await controls.getByLabel("Tình huống").selectOption("behind");
  await expect(status).toContainText("behind");
  await controls.getByLabel("Tình huống").selectOption("near");
  await expect(status).toContainText("before-near");
  await controls.getByLabel("Tình huống").selectOption("outside");
  await expect(status).toContainText("outside");
  await controls.getByLabel("Tình huống").selectOption("visible");
  await expect(status).toContainText("visible");

  const initialPixel = await pixel.textContent();
  await controls.getByLabel("Vertical FOV").fill("90");
  await expect(pixel).not.toHaveText(initialPixel ?? "");

  const initialPoint = await worldPoint.textContent();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(worldPoint).not.toHaveText(initialPoint ?? "");

  const pointBeforeDrag = await worldPoint.textContent();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await canvas.click({ position: { x: box.width * 0.82, y: box.height * 0.58 } });
  }
  await expect(worldPoint).not.toHaveText(pointBeforeDrag ?? "");

  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Vertical FOV")).toHaveValue("60");
  expect(errors).toEqual([]);
});

test("Project 12 Rotation Lab changes order, captures drag and preserves geometry", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/rotating-triangle/06-animation-va-validation");

  const canvas = page.locator('canvas[aria-label^="Tam giác 3D"]');
  const controls = page.locator(".lab-controls");
  await expect(canvas).toBeVisible();
  const angles = page
    .locator(".lab-readout div")
    .filter({ hasText: "pitch / yaw / roll" })
    .locator("dd");
  const edgeError = page
    .locator(".lab-readout div")
    .filter({ hasText: "edge-length error" })
    .locator("dd");
  const roundTrip = page
    .locator(".lab-readout div")
    .filter({ hasText: "round-trip error" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  const initialAngles = await angles.textContent();
  await controls.getByLabel("Yaw Y").fill("70");
  await expect(angles).not.toHaveText(initialAngles ?? "");
  await controls.getByLabel("Rotation order").selectOption("zyx");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "rotation order" }).locator("dd"),
  ).toHaveText("ZYX");

  const beforeDrag = await angles.textContent();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
    await page.mouse.down();
    await expect(captureState).toHaveText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.58);
    await page.mouse.up();
  }
  await expect(angles).not.toHaveText(beforeDrag ?? "");
  await expect(captureState).toHaveText("đã nhả");
  const edgeErrorValue = Number(await edgeError.textContent());
  const roundTripValue = Number(await roundTrip.textContent());
  expect(Number.isFinite(edgeErrorValue)).toBe(true);
  expect(Number.isFinite(roundTripValue)).toBe(true);
  expect(edgeErrorValue).toBeLessThan(1e-9);
  expect(roundTripValue).toBeLessThan(1e-9);

  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await canvas.focus();
  await canvas.press("Space");
  await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
  await canvas.press("Space");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Rotation order")).toHaveValue("xyz");

  await page.goto("/projects/rotating-triangle/01-noi-ba-diem-thanh-tam-giac-3d");
  await page.getByLabel("Trạng thái projection").selectOption("near");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "vertex A" }).locator("dd"),
  ).toHaveText("before-near");
  expect(errors).toEqual([]);
});

test("Project 13 Wireframe Cube Lab keeps indexed topology, cache and depth controls", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/wireframe-cube/05-tuong-tac-va-validation");

  const canvas = page.locator('canvas[aria-label^="Cube wireframe"]');
  const controls = page.locator(".lab-controls");
  const projectionCache = page
    .locator(".lab-readout div")
    .filter({ hasText: "projection cache" })
    .locator("dd");
  const visibleEdges = page
    .locator(".lab-readout div")
    .filter({ hasText: "visible edges" })
    .locator("dd");
  const edgeError = page
    .locator(".lab-readout div")
    .filter({ hasText: "max edge error" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(projectionCache).toHaveText("8 kết quả / frame");
  await expect(visibleEdges).toHaveText("12 / 12");
  expect(Number(await edgeError.textContent())).toBeLessThan(1e-9);

  await controls.getByLabel("Edge").selectOption("6");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "edge #6" }).locator("dd"),
  ).toHaveText("6 → 7");
  await controls.getByLabel("Depth cue").uncheck();
  await expect(controls.getByLabel("Depth cue")).not.toBeChecked();
  await controls.getByLabel("Rotation order").selectOption("zyx");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
    await page.mouse.down();
    await expect(captureState).toHaveText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.58);
    await page.mouse.up();
  }
  await expect(captureState).toHaveText("đã nhả");

  await canvas.focus();
  await canvas.press("c");
  await expect(controls.getByLabel("Depth cue")).toBeChecked();
  await canvas.press("Space");
  await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
  await canvas.press("Space");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(controls.getByLabel("Rotation order")).toHaveValue("xyz");
  await expect(controls.getByLabel("Depth cue")).toBeChecked();
  expect(errors).toEqual([]);
});

test("Project 14 FPS Camera Lab moves, looks, captures the pointer and respects bounds", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/fps-camera-room/07-gioi-han-can-phong-va-validation");

  const canvas = page.locator('canvas[aria-label^="Căn phòng wireframe"]');
  const controls = page.locator(".lab-controls");
  const position = page
    .locator(".lab-readout div")
    .filter({ hasText: "camera position" })
    .locator("dd");
  const angles = page.locator(".lab-readout div").filter({ hasText: "yaw / pitch" }).locator("dd");
  const basisError = page
    .locator(".lab-readout div")
    .filter({ hasText: "basis error" })
    .locator("dd");
  const roundTrip = page
    .locator(".lab-readout div")
    .filter({ hasText: "round-trip error" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(position).toHaveText("(0.00, 1.60, 2.00)");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "room bounds" }).locator("dd"),
  ).toHaveText("bên trong");
  expect(Number(await basisError.textContent())).toBeLessThan(1e-9);
  expect(Number(await roundTrip.textContent())).toBeLessThan(1e-9);

  await controls.getByLabel("FPS giả lập").selectOption("30");
  await page.getByRole("button", { name: "Bước W" }).click();
  await expect(position).not.toHaveText("(0.00, 1.60, 2.00)");

  const beforeDrag = await angles.textContent();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
    await page.mouse.down();
    await expect(captureState).toHaveText("đang nhìn");
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.58);
    await page.mouse.up();
  }
  await expect(angles).not.toHaveText(beforeDrag ?? "");
  await expect(captureState).toHaveText("đã nhả");

  await controls.getByLabel("Pitch").fill("89");
  await expect(controls.getByLabel("Pitch")).toHaveValue("89");
  await page.getByRole("button", { name: "Tạm dừng" }).click();
  const pausedPosition = await position.textContent();
  await page.getByRole("button", { name: "Bước D" }).click();
  await expect(position).toHaveText(pausedPosition ?? "");
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(position).toHaveText("(0.00, 1.60, 2.00)");
  await expect(controls.getByLabel("Yaw")).toHaveValue("0");
  await expect(controls.getByLabel("Pitch")).toHaveValue("0");
  expect(errors).toEqual([]);
});

test("Project 15 Pipeline Lab steps stages, classifies presets and preserves MVP", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/3d-pipeline-inspector/07-ghep-mvp-va-validation");

  const canvas = page.locator('canvas[aria-label^="Pipeline 3D"]');
  const controls = page.locator(".lab-controls");
  const selectedStage = page
    .locator(".lab-readout div")
    .filter({ hasText: "stage đang chọn" })
    .locator("dd");
  const stageValue = page.locator(".lab-readout div").filter({ hasText: "giá trị" }).locator("dd");
  const status = page.locator(".lab-readout div").filter({ hasText: "trạng thái" }).locator("dd");
  const agreement = page
    .locator(".lab-readout div")
    .filter({ hasText: "MVP agreement error" })
    .locator("dd");
  const captureState = page
    .locator(".lab-readout div")
    .filter({ hasText: "pointer capture" })
    .locator("dd");

  await expect(canvas).toBeVisible();
  await expect(selectedStage).toHaveText("SCREEN");
  expect(Number(await agreement.textContent())).toBeLessThan(1e-9);

  await controls.getByLabel("Stage").selectOption("1");
  await expect(selectedStage).toHaveText("WORLD");
  const beforeYaw = await stageValue.textContent();
  await controls.getByLabel("Model yaw").fill("75");
  await expect(stageValue).not.toHaveText(beforeYaw ?? "");

  await controls.getByLabel("Tình huống").selectOption("near");
  await expect(status).toContainText("before-near");
  await controls.getByLabel("Tình huống").selectOption("behind");
  await expect(status).toContainText("behind");
  await controls.getByLabel("Tình huống").selectOption("far");
  await expect(status).toContainText("beyond-far");
  await controls.getByLabel("Tình huống").selectOption("outside");
  await expect(status).toContainText("outside");
  await controls.getByLabel("Tình huống").selectOption("visible");
  await expect(status).toContainText("visible");

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await canvas.hover({
      position: {
        x: Math.round(box.width * 0.52),
        y: Math.round(box.height * 0.48),
      },
    });
    await page.mouse.down();
    await expect(captureState).toHaveText("đang kéo");
    await page.mouse.move(box.x + box.width * 0.64, box.y + box.height * 0.56);
    await page.mouse.up();
  }
  await expect(captureState).toHaveText("đã nhả");

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
  await page.getByRole("button", { name: "Tạm dừng" }).click();
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await page.getByRole("button", { name: "Đặt lại" }).click();
  await expect(selectedStage).toHaveText("SCREEN");
  await expect(status).toContainText("visible");
  expect(Number(await agreement.textContent())).toBeLessThan(1e-9);
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
  await controls.getByLabel("Góc nhìn cube").selectOption("overlap");
  await expect(difference).toHaveText("0 color · 0 depth");
  await expect(fragments).toHaveText(/\d+ \/ \d+/);

  await controls.getByLabel("Depth test").uncheck();
  await expect(difference).not.toHaveText("0 color · 0 depth");
  await controls.getByLabel("Đảo draw order").check();
  await controls.getByLabel("Xem depth").check();

  await controls.getByLabel("Depth test").check();
  await expect(difference).toHaveText("0 color · 0 depth");
  await page.getByRole("button", { name: /Tạm dừng|Cho cube quay/ }).click();
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
