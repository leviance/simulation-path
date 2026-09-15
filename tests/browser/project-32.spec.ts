import { expect, test } from "@playwright/test";

test("Project 32 Canvas compares traffic and releases pointer capture", async ({ page }) => {
  await page.goto("/projects/memory-layout-race/08-hoan-thien-memory-layout-race");
  const canvas = page.getByRole("img", {
    name: /Sơ đồ bộ nhớ AoS và SoA/i,
  });
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/AoS cache lines \/ loaded/i)).toBeVisible();
  await expect(page.getByText(/AoS ↔ SoA agreement/i)).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Project 32 Canvas has no bounding box");
  await page.mouse.move(box.x + box.width * 0.25, box.y + 45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + 45);
  await page.mouse.up();
  await expect(page.getByText(/Pointer đã được nhả/i)).toBeVisible();
});

test("Project 32 opening lesson does not expose later layout experiments", async ({ page }) => {
  await page.goto("/projects/memory-layout-race/01-khoa-workload-mot-trieu-particles");
  await expect(page.getByText(/State đang quan sát/i)).toBeVisible();
  await expect(page.getByLabel(/Memory layout/i)).toHaveCount(0);
  await expect(page.getByLabel(/Workload/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /benchmark|scaling/i })).toHaveCount(0);
});
