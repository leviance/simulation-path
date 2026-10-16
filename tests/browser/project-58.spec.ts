import { expect, test } from "@playwright/test";
const route = "/projects/voxel-chunk/07-kiem-chung-va-hoan-thien";

test("Voxel pause button does not resume when focus leaves the canvas", async ({ page }) => {
  await page.goto(route);
  await page.getByLabel("Voxel Chunk Lab", { exact: true }).press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeVisible();
});

test("Voxel cube face experiment preserves mesh and repeated Space does not toggle", async ({
  page,
}) => {
  await page.goto("/projects/voxel-chunk/01-ve-cube-dau-tien");
  const inspector = page.getByRole("region", { name: "Phòng thực hành từng mặt cube" });
  await inspector.getByRole("checkbox").check();
  await expect(inspector).toContainText("Tam giác 2 đã đảo normal");
  await expect(page.locator(".lab-readout")).toContainText("12");
  await page.goto(route);
  await page
    .getByLabel("Voxel Chunk Lab", { exact: true })
    .dispatchEvent("keydown", { key: " ", repeat: true, bubbles: true });
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeVisible();
});
test("Voxel lesson stages controls and preserves chunk data when slicing", async ({ page }) => {
  await page.goto("/projects/voxel-chunk/01-ve-cube-dau-tien");
  await expect(page.getByLabel("Khối mẫu", { exact: true })).toHaveCount(0);
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Khối mẫu", { exact: true }).selectOption("1");
  await expect(read("Block đặc trong dữ liệu")).toHaveText("4096");
  await expect(read("Tam giác đang gửi rasterizer")).toHaveText("49152");
  await page.getByLabel("Lớp y", { exact: true }).fill("0");
  await expect(read("Tam giác đang gửi rasterizer")).toHaveText("3072");
  await expect(read("Block đặc trong dữ liệu")).toHaveText("4096");
  await page.getByLabel("Ô x", { exact: true }).fill("15");
  await expect(read("Ô đang đọc")).toContainText("index 127");
  await page.getByRole("button", { name: "Kiểm chứng", exact: true }).click();
  await expect(read("Kiểm chứng")).toContainText("PASS");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("Block đặc trong dữ liệu")).toHaveText("1408");
});
test("Voxel reduced motion keeps rotation paused and keyboard remains usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeDisabled();
  await page.getByLabel("Voxel Chunk Lab", { exact: true }).press("ArrowRight");
  await expect(page.locator(".lab-readout")).toContainText("yaw 0.78");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Chạy xoay", exact: true })).toBeEnabled();
});
