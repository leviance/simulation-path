import { expect, test, type Page } from "@playwright/test";

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("P29 overview and first lesson hydrate without timing or ARIA mismatches", async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto("/projects/quadtree-map-editor");
  await expect(page.locator(".lab-readout")).not.toContainText("—", { timeout: 15000 });
  await page.getByRole("button", { name: "Chọn trong viewport", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.locator("[data-map-selected]").getAttribute("data-map-selected")),
    )
    .toBeGreaterThan(0);
  const surface = page.locator('canvas[aria-label="Biên tập bản đồ 2D bằng Quadtree"]');
  const helpId = await surface.getAttribute("aria-describedby");
  expect(helpId).toBe("quadtree-map-editor-help-overview");
  await expect(page.locator('[id="' + helpId + '"]')).toHaveCount(1);
  await page
    .locator('a[href="/projects/quadtree-map-editor/01-ve-ban-do-va-tao-doi-tuong"]')
    .first()
    .click();
  await expect(surface).toHaveAttribute("aria-describedby", "quadtree-map-editor-help-map-objects");
  await expect(page.locator(".lab-readout")).not.toContainText("—", { timeout: 15000 });
  await expect(page.locator("[data-map-count]")).toHaveAttribute("data-map-count", "100000");
  expect(errors).toEqual([]);
});

test("P29 edits the real 100000-object map and checks the edited index", async ({ page }) => {
  const errors = captureErrors(page);
  await page.goto("/projects/quadtree-map-editor/11-du-an-hoan-chinh-va-nghiem-thu");
  const board = page.locator("[data-map-count]");
  // Canvas has an accessible name but no explicit img role; address the element itself.
  const surface = page.locator('canvas[aria-label="Biên tập bản đồ 2D bằng Quadtree"]');
  await expect(surface).toBeVisible();
  await expect(board).toHaveAttribute("data-map-count", "100000");
  await expect(page.locator(".lab-readout")).not.toContainText("—", { timeout: 15000 });
  await page.getByRole("button", { name: "Chọn trong viewport", exact: true }).click();
  const selection = await board.getAttribute("data-map-selected");
  expect(Number(selection)).toBeGreaterThan(0);
  const revision = Number(await board.getAttribute("data-map-revision"));
  await surface.focus();
  await surface.press("Shift+ArrowRight");
  await expect
    .poll(async () => Number(await board.getAttribute("data-map-revision")))
    .toBeGreaterThan(revision);
  await expect(board).toHaveAttribute("data-map-selected", selection!);
  await page.getByRole("button", { name: "Thêm tại tâm camera", exact: true }).click();
  await expect(board).toHaveAttribute("data-map-count", "100001");
  await page.getByRole("button", { name: "Xóa selection", exact: true }).click();
  await expect(board).toHaveAttribute("data-map-count", "100000");
  await page.getByRole("button", { name: "Đang dùng Quadtree", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đang dùng brute force", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đang dùng brute force", exact: true }).click();
  await page.getByRole("button", { name: "Kiểm reference và topology", exact: true }).click();
  await expect(page.getByText(/Reference: (37\/37|38\/38) query · 0 lỗi.*hoàn tất/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("link", { name: /Tải ZIP Dự án/ }).first()).toHaveAttribute(
    "href",
    "/downloads/project-29-quadtree-map-editor.zip",
  );
  expect(errors).toEqual([]);
});
