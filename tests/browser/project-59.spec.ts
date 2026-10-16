import { expect, test } from "@playwright/test";
const route = "/projects/voxel-hidden-faces/08-kiem-chung-va-hoan-thien";

test("Hidden-face pause button respects a keyboard-started animation", async ({ page }) => {
  await page.goto(route);
  await page.getByLabel("Hidden Faces Lab", { exact: true }).press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeVisible();
});

test("Hidden faces ignore repeated toggle keys", async ({ page }) => {
  await page.goto(route);
  const lab = page.getByLabel("Hidden Faces Lab", { exact: true });
  await lab.dispatchEvent("keydown", { key: " ", repeat: true, bubbles: true });
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeVisible();
  await lab.dispatchEvent("keydown", { key: "m", repeat: true, bubbles: true });
  await expect(page.getByLabel("Bỏ mặt tiếp giáp", { exact: true })).toBeChecked();
});
test("Hidden faces compare baseline, cap the cut and explain individual neighbors", async ({
  page,
}) => {
  await page.goto("/projects/voxel-hidden-faces/01-do-ban-chua-toi-uu");
  await expect(page.getByLabel("Bỏ mặt tiếp giáp", { exact: true })).toHaveCount(0);
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Baseline → đang vẽ (triangles)")).toHaveText("49152 → 3072");
  await expect(read("Giảm geometry")).toHaveText("93.75%");
  const count = await read("Rebuild / rasterize").textContent();
  await page.getByRole("button", { name: "Xoay một bước", exact: true }).click();
  const after = await read("Rebuild / rasterize").textContent();
  expect(after?.split(" / ")[0]).toBe(count?.split(" / ")[0]);
  await page.getByLabel("Cắt ở y", { exact: true }).fill("0");
  await expect(read("Baseline → đang vẽ (triangles)")).toHaveText("3072 → 1152");
  await page.getByLabel("Block y", { exact: true }).fill("0");
  await page.getByLabel("Hướng mặt", { exact: true }).selectOption("2");
  await expect(read("Quyết định của quy tắc culling")).toContainText("mặt cắt");
  await page.getByRole("button", { name: "Kiểm chứng mặt voxel", exact: true }).click();
  await expect(read("Kiểm chứng")).toContainText("PASS");
});
test("Hidden faces keep reduced-motion pause and pointer-free inspection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeDisabled();
  await page.getByLabel("Khối mẫu hidden faces", { exact: true }).selectOption("1");
  await page.getByLabel("Hidden Faces Lab", { exact: true }).press("m");
  await expect(page.locator(".lab-readout")).toContainText("24 → 24");
  await page.getByLabel("Hidden Faces Lab", { exact: true }).press("m");
  await expect(page.locator(".lab-readout")).toContainText("24 → 20");
});
