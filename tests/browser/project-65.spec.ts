import { expect, test } from "@playwright/test";
const route = "/projects/simulator-controls/07-kiem-chung-va-hoan-thien";
test("controls share one model, preserve reset settings and allow manual stepping", async ({
  page,
}) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Trạng thái")).toHaveText("Đang tạm dừng");
  const range = page.getByLabel("Trọng lực (px/s²)", { exact: true });
  await range.focus();
  await range.press("End");
  await expect(range).toHaveValue("1200");
  await page.getByRole("button", { name: "Một bước 1/120 s", exact: true }).click();
  await expect(read("Gravity / thời gian mô phỏng")).toHaveText("1200 / 0.008 s");
  await page.getByRole("button", { name: "Reset cảnh", exact: true }).click();
  await expect(read("Gravity / thời gian mô phỏng")).toHaveText("1200 / 0.000 s");
  await expect(read("State audit")).toHaveText("Hợp lệ");
});
test("controls do not click on outside release and slider capture cannot leak into scene", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = page.getByLabel("Simulator Controls Lab", { exact: true });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas missing");
  const scale = Math.min(box.width / 960, box.height / 540);
  const p = (x: number, y: number) => ({
    x: box.x + (box.width - 960 * scale) / 2 + x * scale,
    y: box.y + (box.height - 540 * scale) / 2 + y * scale,
  });
  let target = p(800, 100);
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  target = p(100, 100);
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  await expect(page.locator(".lab-readout")).toContainText("Đang tạm dừng");
  target = p(800, 252);
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  target = p(50, 300);
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Click vào cảnh")).toHaveText("0");
  await expect(read("Gravity / thời gian mô phỏng")).toHaveText("0 / 0.000 s");
});
test("controls let Tab leave canvas and honor reduced motion without blocking manual work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const canvas = page.getByLabel("Simulator Controls Lab", { exact: true });
  await canvas.focus();
  await canvas.press("Tab");
  await canvas.press("Space");
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  await expect(page.locator(".lab-readout")).toContainText("Đang tạm dừng");
  await canvas.press("Tab");
  await canvas.press("Tab");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByRole("button", { name: "Một bước 1/120 s", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("0.008 s");
});
