import { expect, test } from "@playwright/test";

test("Project 40 exposes CSR construction and complete workbench source", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/projects/gpu-spatial-grid-neighbors/01-khoa-hop-dong-grid-va-neighbor");
  const contractCanvas = page.locator("canvas.lab-canvas");
  const beforeDrag = await page.getByText("World → cell").locator("..").textContent();
  const box = await contractCanvas.boundingBox();
  expect(box).not.toBeNull();
  await contractCanvas.hover({ position: { x: 50, y: 70 } });
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width - 60, box!.y + box!.height - 90);
  await page.mouse.up();
  await expect
    .poll(async () => page.getByText("World → cell").locator("..").textContent())
    .not.toBe(beforeDrag);

  await page.goto("/projects/gpu-spatial-grid-neighbors/02-dem-particles-bang-atomic");
  await page.getByLabel("Counter update").selectOption("plain");
  const stepButton = page.getByRole("button", { name: "Bước một pass" });
  for (let index = 0; index < 63; index += 1) await stepButton.click();
  await expect(page.getByText("LOST UPDATE", { exact: false })).toBeVisible();

  await page.goto("/projects/gpu-spatial-grid-neighbors/03-bien-counts-thanh-offsets");
  await page.getByLabel("Count 0").fill("7");
  await expect(page.getByText("= 17", { exact: false })).toBeVisible();

  await page.goto("/projects/gpu-spatial-grid-neighbors/04-scatter-vao-grid-csr");
  await expect(
    page.getByRole("heading", { name: "Đưa particle indices vào các đoạn CSR" }),
  ).toBeVisible();
  await expect(page.getByLabel("Cell size")).toBeVisible();
  await expect(page.getByText("Chuỗi compute pass", { exact: true })).toBeVisible();
  await page.getByLabel("Arrival order").selectOption("reverse");
  await expect(page.getByText("reverse", { exact: false })).toBeVisible();

  await page.goto("/projects/gpu-spatial-grid-neighbors/09-hoan-thien-gpu-grid-workbench");
  await expect(page.getByRole("heading", { name: "Hoàn thiện GPU Grid Workbench" })).toBeVisible();
  await expect(page.getByText("Mô hình đo thời gian", { exact: true })).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();

  const canvas = page.locator("canvas.lab-canvas");
  await expect(canvas).toBeVisible();
  const initialSize = await canvas.evaluate((element) => ({
    bitmapWidth: (element as HTMLCanvasElement).width,
    bitmapHeight: (element as HTMLCanvasElement).height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }));
  await page.waitForTimeout(500);
  const stableSize = await canvas.evaluate((element) => ({
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
