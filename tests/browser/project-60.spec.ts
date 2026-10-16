import { expect, test } from "@playwright/test";
const route = "/projects/voxel-ray-editor/09-kiem-chung-va-hoan-thien";

test("DDA pause and repeated keys retain playback and page scroll state", async ({ page }) => {
  await page.goto("/projects/voxel-ray-editor/04-di-qua-tung-o");
  await page.getByLabel("Khối mẫu ray editor", { exact: true }).selectOption("5");
  const lab = page.getByLabel("Voxel Ray Editor Lab", { exact: true });
  await lab.press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy DDA", exact: true })).toBeVisible();
  await lab.focus();
  const prevented = await lab.evaluate((element) => {
    const event = new KeyboardEvent("keydown", {
      key: " ",
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});
test("Voxel editor stages mutation controls and edits one block at a time", async ({ page }) => {
  await page.goto("/projects/voxel-ray-editor/01-tam-ngam-tren-khoi-dat");
  await expect(page.getByRole("button", { name: "Phá block đang ngắm", exact: true })).toHaveCount(
    0,
  );
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Hit đầu tiên")).not.toHaveText("MISS");
  const before = await read("Block / triangles").textContent();
  expect(before).toContain("1408 / ");
  const counts = await read("Rebuild / raster / pick").textContent();
  await page.getByLabel("Pixel x", { exact: true }).fill("161");
  const afterAim = await read("Rebuild / raster / pick").textContent();
  expect(afterAim?.split(" / ").slice(0, 2)).toEqual(counts?.split(" / ").slice(0, 2));
  await page.getByRole("button", { name: "Phá block đang ngắm", exact: true }).click();
  await expect(read("Block / triangles")).toContainText("1407 / ");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("Block / triangles")).toContainText("1408 / ");
  await page.getByRole("button", { name: "Đặt block ở ô xanh", exact: true }).click();
  await expect(read("Block / triangles")).toContainText("1409 / ");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Tầm với", { exact: true }).fill("1");
  await expect(read("Hit đầu tiên")).toHaveText("MISS");
  await expect(
    page.getByRole("button", { name: "Đặt block ở ô xanh", exact: true }),
  ).toBeDisabled();
});
test("Voxel editor reduced motion still allows manual DDA inspection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy DDA", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Một ô tiếp theo", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("2/");
  await expect(page.getByRole("region", { name: "Trạng thái từng trục DDA" })).toContainText(
    "tDelta",
  );
});
