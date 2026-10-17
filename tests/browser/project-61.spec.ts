import { expect, test } from "@playwright/test";
const route = "/projects/voxel-greedy-meshing/09-kiem-chung-va-hoan-thien";
test("Greedy mesh counts, controls, oracle and camera cache", async ({ page }) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Mặt đơn vị → quad đang vẽ")).toHaveText("1536 → 6");
  await page.getByLabel("Gộp mặt greedy", { exact: true }).uncheck();
  await expect(read("Mặt đơn vị → quad đang vẽ")).toHaveText("1536 → 1536");
  await page.getByLabel("Gộp mặt greedy", { exact: true }).check();
  const before = await read("Mesh rebuild / raster").textContent();
  await page.getByRole("button", { name: "Xoay một bước", exact: true }).click();
  await expect
    .poll(async () => (await read("Mesh rebuild / raster").textContent())?.split(" / ")[0])
    .toBe(before?.split(" / ")[0]);
  await page.getByRole("button", { name: "Đối chiếu khối này", exact: true }).click();
  await expect(read("Oracle hiện tại")).toContainText("PASS");
  await page.getByLabel("Khối mẫu greedy", { exact: true }).selectOption("3");
  await expect(read("Mặt đơn vị → quad đang vẽ")).toHaveText("1542 → 12");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("Mặt đơn vị → quad đang vẽ")).toHaveText("1536 → 6");
});
test("Greedy stepper honors pause, repeated Space and reduced motion", async ({ page }) => {
  await page.goto(route);
  const canvas = page.getByLabel("Greedy Meshing Lab", { exact: true });
  await page.getByLabel("Khối mẫu greedy", { exact: true }).selectOption("7");
  await page.getByLabel("Hướng mặt greedy", { exact: true }).selectOption("4");
  await page.getByLabel("Mặt phẳng greedy", { exact: true }).fill("9");
  await canvas.press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy gộp", exact: true })).toBeVisible();
  const prevented = await canvas.evaluate((element) => {
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy gộp", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Về đầu mask", exact: true }).click();
  await page.getByRole("button", { name: "Một rectangle", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("1/4");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Khối mẫu greedy", { exact: true }).selectOption("5");
  await canvas.press("Space");
  await expect(page.getByRole("button", { name: "Chạy gộp", exact: true })).toBeDisabled();
  await expect(page.locator(".lab-readout")).toContainText("0/0");
});
