import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
const finalRoute = "/projects/spring-chain/08-do-energy-stress-test-va-nghiem-thu";
const readout = (page: Page, label: string) =>
  page.locator("dl.lab-readout > div").filter({ hasText: label }).locator("dd");
const canvasOf = (page: Page) =>
  page.locator('canvas[aria-label="Chuỗi lò xo 2D: kéo mass, quan sát dao động và năng lượng"]');

test("Project 25 steps, captures a mass, accepts keyboard input and rejects an unsafe step", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto(finalRoute);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
  await expect(readout(page, "Topology")).toHaveText("32 mass / 31 spring");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("0.002 s / 1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const scale = Math.min(box.width / 1100, box.height / 820);
    const left = box.x + (box.width - 1100 * scale) / 2;
    const top = box.y + (box.height - 820 * scale) / 2;
    // WorldView applied to the default 32-node hanging chain.
    const worldScale = Math.min(110, 500 / (31 * 0.22 + (0.04 * 9.81 * 31 * 32) / (2 * 120) + 1.6));
    const x = left + (350 + 0.35 * worldScale + 1) * scale;
    const y = top + (130 + 3.52 * worldScale) * scale;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(readout(page, "Pointer / release cap")).toContainText("đang kéo");
    await page.mouse.move(x + 30 * scale, y);
    await page.mouse.up();
    await expect(readout(page, "Pointer / release cap")).toContainText("đã nhả");
    await expect(readout(page, "Khối được chọn")).not.toContainText("p = (0.3500, -3.5200)");
  }
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("0.000 s / 0");
  const before = await readout(page, "Khối được chọn").innerText();
  await canvas.press("ArrowRight");
  await expect(readout(page, "Khối được chọn")).not.toHaveText(before);
  await page.getByLabel("Preset chuỗi lò xo", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("0.033 s / 1");
  await expect(page.locator(".lab-hint").filter({ hasText: "Thí nghiệm đã dừng" })).toBeVisible();
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  expect(errors).toEqual([]);
});

test("Project 25 runs a bounded 100-mass energy experiment and can cancel the next job", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto(finalRoute);
  await expect(canvasOf(page)).toBeVisible();
  await page.getByLabel("Số mass", { exact: true }).selectOption("100");
  await expect(readout(page, "Topology")).toHaveText("100 mass / 99 spring");
  await page.getByRole("button", { name: "Chạy nhanh 20 giây", exact: true }).click();
  await expect(readout(page, "Elapsed / bước physics")).toHaveText("20.000 s / 9600", {
    timeout: 25000,
  });
  await expect(readout(page, "History / fast job")).toHaveText("1201 mẫu · còn 0 bước");
  await expect(readout(page, "Stretch / speed / anchor error")).toContainText("0.00e+0 m");
  await page.getByRole("button", { name: "Chạy nhanh 20 giây", exact: true }).click();
  await page.getByRole("button", { name: "Dừng job", exact: true }).click();
  await expect(readout(page, "History / fast job")).toContainText("còn 0 bước");
  await expect(page.getByRole("button", { name: "Chạy nhanh 20 giây", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("Project 25 Hooke lesson exposes a two-body fixture without future controls", async ({
  page,
}) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/projects/spring-chain/02-tinh-luc-hooke-tren-mot-lo-xo");
  await expect(canvasOf(page)).toBeVisible();
  await expect(readout(page, "Topology")).toHaveText("2 mass / 1 spring");
  await expect(readout(page, "Force pair")).toContainText("F_A = (24.0000, 0.0000) N");
  await page.getByLabel("Khoảng cách hai đầu", { exact: true }).press("End");
  await expect(readout(page, "Distance / rest length / stretch")).toHaveText(
    "1.8000 / 1.0000 / 0.8000 m",
  );
  await expect(readout(page, "Force pair")).toContainText("96.0000");
  await expect(page.getByLabel("Số mass", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
