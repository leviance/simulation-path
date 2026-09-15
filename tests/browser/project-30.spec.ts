import { expect, test } from "@playwright/test";

test("Project 30 Canvas exposes Octree state and keeps pointer interaction balanced", async ({
  page,
}) => {
  await page.goto("/projects/point-cloud-octree/09-hoan-thien-point-cloud-octree");
  const canvas = page.getByRole("img", {
    name: /Point cloud 3D được tổ chức bằng Octree/i,
  });
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/Tree topology \/ rebuild/i)).toBeVisible();
  await expect(page.getByText(/Octree candidates \/ brute scans/i)).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Project 30 Canvas has no bounding box");
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.mouse.up();
  await expect(page.getByText(/đã nhả/)).toBeVisible();
});

test("Project 30 early Octant lesson does not reveal query and benchmark controls", async ({
  page,
}) => {
  await page.goto("/projects/point-cloud-octree/01-point-cloud-va-tam-octant");
  await expect(page.getByText(/Số point trong octant 0 → 7/i)).toBeVisible();
  await expect(page.getByLabel(/Query X/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /So benchmark/i })).toHaveCount(0);
});
