import { expect, test } from "@playwright/test";

test("Project 41 teaches the pair model and exposes a stable complete lab", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/projects/lennard-jones-pair/01-dung-cap-nguyen-tu-va-khoang-cach");
  await expect(
    page.getByRole("heading", { name: "Dựng hai nguyên tử và đo khoảng cách" }).first(),
  ).toBeVisible();

  const distanceCanvas = page.locator("canvas.lab-canvas");
  const distanceReadout = page
    .locator(".lab-readout div")
    .filter({ hasText: "Khoảng cách r/σ" })
    .locator("dd");
  const distanceBefore = await distanceReadout.textContent();
  const box = await distanceCanvas.boundingBox();
  expect(box).not.toBeNull();
  await distanceCanvas.hover({ position: { x: box!.width * 0.6, y: box!.height * 0.5 } });
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.58, box!.y + box!.height * 0.35);
  await page.mouse.up();
  await expect.poll(async () => distanceReadout.textContent()).not.toBe(distanceBefore);

  await page.goto("/projects/lennard-jones-pair/03-tu-do-doc-the-nang-den-luc");
  const potentialSlope = page
    .locator(".lab-readout div")
    .filter({ hasText: "Độ dốc dU/dr" })
    .locator("dd");
  await page.getByRole("button", { name: "Vùng đẩy" }).click();
  await expect(potentialSlope).toContainText("đẩy ·");
  await page.getByRole("button", { name: "Vùng hút" }).click();
  await expect(potentialSlope).toContainText("hút ·");
  const forceSum = page
    .locator(".lab-readout div")
    .filter({ hasText: "Tổng lực FA+FB" })
    .locator("dd");
  await expect(forceSum).toContainText("e+0");

  await page.goto("/projects/lennard-jones-pair/05-cho-hai-nguyen-tu-chay-bang-velocity-verlet");
  const frameGuard = page
    .locator(".lab-readout div")
    .filter({ hasText: "Giới hạn bước / trạng thái kéo" })
    .locator("dd");
  await expect(frameGuard).toContainText("0 bước con");
  await page.getByRole("button", { name: "Tiến một bước" }).click();
  await expect(frameGuard).toContainText("1 bước con");
  const simulationTime = page
    .locator(".lab-readout div")
    .filter({ hasText: "Thời gian mô phỏng" })
    .locator("dd");
  await expect(simulationTime).not.toHaveText("0.0000");
  await page.getByLabel("Fixed dt").selectOption({ label: "1/250" });
  await expect(simulationTime).toHaveText("0.0000");

  await page.goto("/projects/lennard-jones-pair/07-hoan-thien-lennard-jones-pair-lab");
  await expect(
    page.getByRole("heading", { name: "Hoàn thiện Lennard–Jones Pair Lab" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Toàn bộ mã nguồn của dự án", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kiểm chứng mô hình chuẩn" }).click();
  const validation = page
    .locator(".lab-readout div")
    .filter({ hasText: "Kiểm chứng" })
    .locator("dd");
  await expect(validation).toContainText("PASS");
  await expect(
    page.locator(".lab-readout div").filter({ hasText: "Các phép kiểm" }).locator("dd"),
  ).toContainText("năng lượng ✓");

  const finalCanvas = page.locator("canvas.lab-canvas");
  const initialSize = await finalCanvas.evaluate((element) => ({
    bitmapWidth: (element as HTMLCanvasElement).width,
    bitmapHeight: (element as HTMLCanvasElement).height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }));
  await page.waitForTimeout(500);
  const stableSize = await finalCanvas.evaluate((element) => ({
    bitmapWidth: (element as HTMLCanvasElement).width,
    bitmapHeight: (element as HTMLCanvasElement).height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }));

  expect(initialSize.clientWidth).toBeGreaterThan(0);
  expect(initialSize.clientHeight).toBeGreaterThan(0);
  expect(initialSize.bitmapWidth).toBeLessThanOrEqual(initialSize.clientWidth * 3 + 1);
  expect(initialSize.bitmapHeight).toBeLessThanOrEqual(initialSize.clientHeight * 3 + 1);
  expect(stableSize).toEqual(initialSize);
  expect(pageErrors).toEqual([]);
});
