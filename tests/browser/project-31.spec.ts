import { expect, test } from "@playwright/test";

test("Project 31 Canvas exposes Barnes-Hut error and releases pointer capture", async ({
  page,
}) => {
  await page.goto("/projects/barnes-hut-nbody/10-hoan-thien-barnes-hut-n-body");
  const canvas = page.getByRole("img", {
    name: /Mô phỏng thiên hà N-body 3D/i,
  });
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/Sai số lực tại body đang theo dõi/i)).toBeVisible();
  await expect(page.getByText(/Topology \/ self-force contract/i)).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Project 31 Canvas has no bounding box");
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.mouse.up();
  await expect(page.getByText(/đã nhả/)).toBeVisible();
});

test("Project 31 scene lesson only exposes state and camera concepts", async ({ page }) => {
  await page.goto("/projects/barnes-hut-nbody/01-thien-ha-va-trang-thai-body");
  await expect(page.getByText(/Scene \/ world state/i)).toBeVisible();
  await expect(page.getByText(/Direct N-body/i)).toHaveCount(0);
  await expect(page.getByLabel(/Theta/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /scaling/i })).toHaveCount(0);
});
