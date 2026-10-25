import { expect, test } from "@playwright/test";

test("P30 surveys the real 100000-point room and checks selection with both methods", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/projects/point-cloud-octree/11-cong-cu-khao-sat-hoan-chinh");
  const board = page.locator("[data-cloud-count]");
  await expect(board).toHaveAttribute("data-cloud-count", "100000");
  await expect(
    page
      .getByText("Build / query / culling / CPU render (ms)", { exact: true })
      .locator("..")
      .locator("dd"),
  ).not.toHaveText("—", { timeout: 15000 });
  await page.getByRole("button", { name: "Chọn mặt sàn Y = 0", exact: true }).click();
  await expect(board).toHaveAttribute("data-cloud-selected", "20000");
  const surface = page.locator('canvas[aria-label="Khảo sát point cloud 3D bằng Octree"]');
  await surface.focus();
  await surface.press("ArrowLeft");
  await expect(board).toHaveAttribute("data-cloud-selected", "20000");
  await page.getByRole("button", { name: "Đang dùng Octree", exact: true }).click();
  await expect(board).toHaveAttribute("data-cloud-selected", "20000");
  await page.getByRole("button", { name: "Kiểm reference và topology", exact: true }).click();
  await expect(page.getByText(/Reference: 36 query · 0 lỗi · hoàn tất/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("link", { name: /Tải ZIP Dự án/ }).first()).toHaveAttribute(
    "href",
    "/downloads/project-30-point-cloud-octree.zip",
  );
  expect(errors).toEqual([]);
});
test("P30 first lesson exposes CSV/render learning without later selection or benchmark controls", async ({
  page,
}) => {
  await page.goto("/projects/point-cloud-octree/01-doc-csv-va-ve-can-phong");
  await expect(page.locator("[data-cloud-count]")).toHaveAttribute("data-cloud-count", "100000");
  await expect(page.getByLabel("Kiểu vùng chọn", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đo Tree / Brute", exact: true })).toHaveCount(0);
  await expect(page.locator("#cloud-survey-help-cloud-csv")).toContainText(
    "điều khiển camera bắt đầu",
  );
});
