import { expect, test } from "@playwright/test";
const route = "/projects/box-layout/09-kiem-chung-va-hoan-thien";
test("box layout reflows hidden children and keeps Model reset independent", async ({ page }) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Node / lượt layout")).toHaveText("9 / 1");
  await expect(read("Root naturalHeight / height")).toHaveText("360 / 492");
  await page.getByRole("button", { name: "Ẩn Reset", exact: true }).click();
  await expect(read("Root naturalHeight / height")).toHaveText("308 / 492");
  await page.getByRole("button", { name: "Reset cảnh (giữ layout)", exact: true }).click();
  await expect(read("Root naturalHeight / height")).toHaveText("308 / 492");
  await page.getByRole("button", { name: "Thêm Label", exact: true }).click();
  await expect(read("Node / lượt layout")).toHaveText("10 / 3");
});
test("box layout reduced motion remains paused and Tab can leave Canvas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy cảnh", exact: true })).toBeDisabled();
  const canvas = page.getByRole("application", { name: "Vertical Box Layout Lab", exact: true });
  await canvas.focus();
  for (let i = 0; i < 4; i++) await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByRole("button", { name: "Một bước 1/120 s", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("480 / 1");
});
