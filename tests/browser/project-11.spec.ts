import { expect, test, type Locator, type Page } from "@playwright/test";

const route = "/projects/perspective-point/08-hoan-thien-va-kiem-chung";
const flightCanvas = (page: Page) => page.locator('canvas[aria-label^="Bay xuyên trường sao"]');
const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

async function ready(page: Page) {
  const canvas = flightCanvas(page);
  await expect
    .poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.width))
    .toBeGreaterThan(300);
  return canvas;
}

async function instruments(page: Page) {
  const button = page.getByRole("button", { name: "Hiện debug", exact: true });
  if (await button.count()) await button.click();
  await expect(read(page, "world point")).toBeVisible();
}

async function frames(page: Page, count = 3) {
  await page.evaluate(async (n) => {
    for (let i = 0; i < n; i++)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, count);
}

// Đọc trên một bản sao: việc thăm dò pixel lặp lại không được đổi bộ raster
// mà Chrome dùng cho gradient trên chính Canvas đang bay.
async function copyFlightFrame(canvas: Locator) {
  return canvas.evaluateHandle((source: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    const context = copy.getContext("2d", { willReadFrequently: true });
    if (!context) throw Error("Missing readback canvas");
    context.drawImage(source, 0, 0);
    return copy;
  });
}

// Chỉ đọc vùng trường sao, không tính HUD, nút bấm hay nội dung readout.
async function picture(canvas: Locator) {
  const copy = await copyFlightFrame(canvas);
  try {
    return await copy.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext("2d");
      if (!ctx) throw Error("Missing 2D context");
      const x = Math.round(el.width * 0.18),
        y = Math.round(el.height * 0.24);
      const pixels = ctx.getImageData(x, y, el.width - 2 * x, el.height - 2 * y).data;
      let hash = 2166136261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      return hash >>> 0;
    });
  } finally {
    await copy.dispose();
  }
}

// Ngôi sao mốc màu hổ phách phải nằm ở pixel tính độc lập từ (1, 0.6, 4).
async function guideAt(canvas: Locator, z: number) {
  const copy = await copyFlightFrame(canvas);
  try {
    return await copy.evaluate((el: HTMLCanvasElement, z) => {
      const ctx = el.getContext("2d");
      if (!ctx) throw Error("Missing 2D context");
      const f = 585 / (2 * Math.tan(Math.PI / 6)),
        depth = 4 - z;
      const x = 550 + f / depth,
        y = 400 - (0.6 * f) / depth;
      const scale = Math.min(el.width / 1100, el.height / 800);
      const px = Math.round((el.width - 1100 * scale) / 2 + x * scale),
        py = Math.round((el.height - 800 * scale) / 2 + y * scale);
      const patch = ctx.getImageData(px - 2, py - 2, 5, 5).data;
      for (let k = 0; k < patch.length; k += 4)
        if (patch[k] > 100 && patch[k] - patch[k + 1] > 14 && patch[k + 1] - patch[k + 2] > 20)
          return true;
      return false;
    }, z);
  } finally {
    await copy.dispose();
  }
}

test("P11 measures from the optical center, handles a hidden second point, and loads real work edits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const gallery = page.locator("[data-native-media]").first();
  const still = gallery.locator("figure img");
  await expect(still).toHaveAttribute("src", "/field-notes/perspective-point/departure.png");
  await gallery.getByRole("button", { name: "Kiểm hai độ sâu khi dừng bay" }).click();
  await expect(still).toHaveAttribute("src", "/field-notes/perspective-point/depth-ruler.png");
  await expect.poll(() => still.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1100);

  const surface = await ready(page);
  await instruments(page);
  const before = await read(page, "world point").innerText();
  const button = page.getByRole("button", { name: "Đo ở hai độ sâu", exact: true });
  await button.click();
  const ruler = page.getByTestId("depth-measurement");
  const length = (Math.hypot(1, 0.6) * (585 / 2)) / Math.tan(Math.PI / 6) / 4;
  await expect(ruler).toContainText(length.toFixed(2) + " px (Z = 4.00)");
  await expect(ruler).toContainText((length / 2).toFixed(2) + " px (Z = 8.00)");
  await expect(read(page, "world point")).toHaveText(before);
  await surface.focus();
  await surface.press("f");
  await expect(ruler).toHaveCount(0);
  await surface.press("m");
  await expect(ruler).toBeVisible();
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("1");
  await button.click();
  await page.getByLabel("Point.Z", { exact: true }).press("ArrowRight");
  await expect(ruler).toContainText("Không đo được");
  await expect(read(page, "trạng thái")).toHaveText("visible");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  const file = page.locator(".voxel-work-file").filter({ hasText: "work/include/lab.hpp" });
  await file.locator("summary").click();
  await expect(file.getByRole("region").first()).toBeVisible();
  await expect(file).toContainText("measureDoubleDepth");
  const zip = await page.request.get("/downloads/project-11-perspective-point.zip");
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
  expect(errors).toEqual([]);
});
test("P11 reduced motion, invalid depth and debug toggle expose honest readouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
  await instruments(page);
  const preset = page.getByLabel("Điểm mẫu", { exact: true });
  await preset.selectOption("3");
  await expect(read(page, "pixel")).toHaveText("Không xác định");
  await expect(read(page, "round-trip error")).toHaveText("Không xác định");
  await preset.selectOption("0");
  await instruments(page);
  await expect(read(page, "trạng thái")).toHaveText("visible");
  await expect(page.getByRole("button", { name: "Cho bay tự động", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect(read(page, "elapsed")).toHaveText("0.100 s");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(read(page, "elapsed")).toHaveText("0.100 s");
});
test("P11 actual marker drag holds offset/depth and final pointer sample; Tab exits canvas", async ({
  page,
}) => {
  await page.goto(route);
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
  const canvas = await ready(page);
  await instruments(page);
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No projection canvas");
  const text = await read(page, "pixel").textContent(),
    coords = text!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const width = Math.max(280, Math.round(box.width)),
    height = Math.max(260, Math.round(box.height)),
    scale = Math.min(width / 1100, height / 800);
  const pointer = (x: number, y: number) => ({
    x: box.x + (((width - 1100 * scale) / 2 + x * scale) * box.width) / width,
    y: box.y + (((height - 800 * scale) / 2 + y * scale) * box.height) / height,
  });
  const start = pointer(coords[0] + 10, coords[1]),
    end = pointer(coords[0] + 60, coords[1] + 20),
    before = await read(page, "world point").textContent();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(read(page, "world point")).toHaveText(before!);
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect(read(page, "world point")).not.toHaveText(before!);
  await expect(read(page, "world point")).toContainText("4.0000");
  await canvas.focus();
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});

test("Project 11 derives perspective with a synchronized XZ/YZ section", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/perspective-point/03-perspective-divide");
  const section = page.locator(".lab-body figure");
  // SSR đã có controls; đợi effect resize Canvas xác nhận client đã hydrate.
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(300);
  const pixel = page.locator(".lab-readout div").filter({ hasText: "pixel" }).locator("dd");
  await expect(section).toContainText("0.2500");
  await expect(pixel).toHaveText("(623.13, 356.13)");
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("1");
  await expect(section).toContainText("0.1250");
  await expect(pixel).toHaveText("(586.56, 378.06)");
  await page.getByLabel("Mặt cắt", { exact: true }).selectOption("y");
  await expect(section).toContainText("Y′ = 0.600 / 8.000 = 0.0750");
  await page.getByLabel("Điểm mẫu", { exact: true }).selectOption("3");
  await expect(section).toContainText("Z không dương");
  await expect(pixel).toHaveText("Không xác định");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(pixel).toHaveText("(623.13, 356.13)");
  expect(errors).toEqual([]);
});

test("P11 projects a stationary star field: hold, cancel opposed keys, reverse, release and reset", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = await ready(page);
  const camera = page.getByRole("slider", { name: "Camera.Z", exact: true });
  const cameraZ = async () => Number(await camera.inputValue());
  await expect(page.getByTestId("flight-status")).toBeVisible();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await frames(page);
  const initial = await picture(canvas);
  await expect.poll(() => guideAt(canvas, 0)).toBe(true);
  await canvas.click({ position: { x: 20, y: 20 } });
  await expect(canvas).toBeFocused();
  try {
    await page.keyboard.down("w");
    await expect.poll(cameraZ).toBeGreaterThan(0.4);
    await page.keyboard.down("s");
    await frames(page);
    const bothHeld = await cameraZ();
    await frames(page, 6);
    expect(await cameraZ()).toBe(bothHeld);
    await page.keyboard.up("w");
    await expect.poll(cameraZ).toBeLessThan(bothHeld);
  } finally {
    await page.keyboard.up("s");
    await page.keyboard.up("w");
  }
  await canvas.focus();
  try {
    await page.keyboard.down("w");
    await expect.poll(cameraZ).toBeGreaterThan(0.7);
  } finally {
    await page.keyboard.up("w");
  }
  await frames(page);
  const stopped = await cameraZ(),
    heldFrame = await picture(canvas);
  expect(heldFrame).not.toBe(initial);
  await frames(page, 7);
  expect(await cameraZ()).toBe(stopped);
  expect(await picture(canvas)).toBe(heldFrame);
  await canvas.press("r");
  await expect.poll(cameraZ).toBe(0);
  await expect.poll(() => picture(canvas)).toBe(initial);
  for (let i = 0; i < 10; i++) await canvas.press("n");
  await expect.poll(cameraZ).toBe(2);
  await expect.poll(() => guideAt(canvas, 2)).toBe(true);
  await canvas.press("r");
  await expect.poll(cameraZ).toBe(0);

  await canvas.focus();
  try {
    await page.keyboard.down("w");
    await expect.poll(cameraZ).toBeGreaterThan(0.2);
    await page.getByRole("button", { name: "Đặt lại", exact: true }).focus();
    await frames(page);
    const onBlur = await cameraZ();
    await frames(page, 6);
    expect(await cameraZ()).toBe(onBlur);
    await canvas.focus();
    await frames(page, 3);
    expect(await cameraZ()).toBe(onBlur);
  } finally {
    await page.keyboard.up("w");
  }
  await instruments(page);
  const position = await read(page, "world point").innerText();
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect.poll(cameraZ).toBeGreaterThan(0.2);
  await expect(read(page, "world point")).toHaveText(position);
  await expect(page.getByRole("link", { name: "Tải ZIP Dự án 11 ↓", exact: true })).toHaveAttribute(
    "href",
    "/downloads/project-11-perspective-point.zip",
  );
});

test("P11 overview serves two different genuine native flight frames", async ({ page }) => {
  await page.goto("/projects/perspective-point");
  await expect(page.getByRole("heading", { name: /Bay xuyên trường sao/i }).first()).toBeVisible();
  const frames = [];
  for (const name of ["departure", "in-flight"]) {
    const response = await page.request.get("/field-notes/perspective-point/" + name + ".png");
    expect(response.ok()).toBe(true);
    const png = await response.body();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1100, 800]);
    const crop = await page.evaluate(
      async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const target = document.createElement("canvas");
        target.width = 1040;
        target.height = 584;
        const ctx = target.getContext("2d");
        if (!ctx) throw Error("Missing native-frame readback");
        ctx.drawImage(image, 30, 108, 1040, 584, 0, 0, 1040, 584);
        const pixels = ctx.getImageData(0, 0, 1040, 584).data;
        let hash = 2166136261,
          lit = 0,
          amberX = 0,
          amberY = 0,
          amber = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i],
            g = pixels[i + 1],
            b = pixels[i + 2];
          if (Math.max(r, g, b) > 136) lit++;
          if (r > 100 && r - g > 14 && g - b > 20) {
            const at = i / 4;
            amberX += 30 + (at % 1040) + 0.5;
            amberY += 108 + Math.floor(at / 1040) + 0.5;
            amber++;
          }
          hash = Math.imul(hash ^ (r + 256 * g + 65536 * b), 16777619);
        }
        return { hash: hash >>> 0, lit, amber, x: amberX / amber, y: amberY / amber };
      },
      "/field-notes/perspective-point/" + name + ".png",
    );
    expect(crop.lit).toBeGreaterThan(30);
    expect(crop.amber).toBeGreaterThan(0);
    const depth = name === "departure" ? 4 : 2;
    const focal = 585 / (2 * Math.tan(Math.PI / 6));
    expect(Math.abs(crop.x - (550 + focal / depth))).toBeLessThan(2);
    expect(Math.abs(crop.y - (400 - (0.6 * focal) / depth))).toBeLessThan(2);
    frames.push(crop.hash);
  }
  expect(frames[0]).not.toBe(frames[1]);
});
