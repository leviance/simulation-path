import { expect, test } from "@playwright/test";
const route = "/projects/voxel-procedural-terrain/09-kiem-chung-va-hoan-thien";

test("four-corner probe exposes the worked interpolation with keyboard-equivalent inputs", async ({
  page,
}) => {
  await page.goto("/projects/voxel-procedural-terrain/04-noi-suy-value-noise");
  const probe = page.getByRole("region", { name: "Thí nghiệm nội suy bốn góc", exact: true });
  const result = probe
    .locator(".lab-readout div")
    .filter({ has: page.getByText("Kết quả nội suy n", { exact: true }) })
    .locator("dd");
  await expect(result).toHaveText("-0.279469939727");
  await probe.getByRole("button", { name: "Góc v00", exact: true }).click();
  await expect(result).toHaveText("0.770840009155");
  const slider = probe.getByLabel("Phần lẻ tx", { exact: true });
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("0.01");
  await probe.getByRole("button", { name: "Về mẫu (−0.25, 0.5)", exact: true }).click();
  await expect(result).toHaveText("-0.279469939727");
});
test("terrain parameters apply as a generation transaction, not per draft input", async ({
  page,
}) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Thế hệ / seed đang dùng")).toHaveText("1 / 42");
  await expect(read("Resident / job chờ")).toHaveText("1 / 8");
  await page.getByLabel("Seed terrain", { exact: true }).fill("43");
  await expect(read("Thế hệ / seed đang dùng")).toHaveText("1 / 42");
  await page.getByRole("button", { name: "Áp dụng cấu hình", exact: true }).click();
  await expect(read("Thế hệ / seed đang dùng")).toHaveText("2 / 43");
  await expect(read("Resident / job chờ")).toHaveText("1 / 8");
  await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(read("Resident / job chờ")).toHaveText("3 / 6");
  await page.getByRole("button", { name: "Kiểm cột và mesh resident", exact: true }).click();
  await expect(read("Kiểm chứng")).toContainText("PASS");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("Thế hệ / seed đang dùng")).toHaveText("1 / 42");
});
test("terrain remains manually usable with reduced motion and signed coordinate inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy tải chunk", exact: true })).toBeDisabled();
  await page.getByLabel("Cột world X", { exact: true }).fill("-1");
  await page.getByLabel("Cột world Z", { exact: true }).fill("-16");
  await expect(page.locator(".lab-readout")).toContainText("(-1,-16)");
  const canvas = page.getByLabel("Procedural Terrain Lab", { exact: true });
  expect(
    await canvas.evaluate((element) => {
      const event = new KeyboardEvent("keydown", {
        key: " ",
        repeat: true,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await canvas.press("n");
  await expect(page.locator(".lab-readout")).toContainText("3 / 6");
});
