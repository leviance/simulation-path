import { expect, test } from "@playwright/test";
const final = "/projects/voxel-chunk-streaming/10-kiem-chung-va-hoan-thien";
test("Streaming supports signed preset, bounded manual jobs and radius changes", async ({
  page,
}) => {
  await page.goto(final);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Resident / cao nhất")).toHaveText("1 / 1");
  await expect(read("Jobs đang chờ")).toHaveText("8");
  await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(read("Batch trước: jobs / budget")).toHaveText("2 / 2");
  await page.getByLabel("Jobs mỗi tick", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Kiểm giới hạn hiện tại", exact: true }).click();
  await expect(read("Sanity hiện tại")).toContainText("PASS");
  await page.getByLabel("Vị trí mẫu streaming", { exact: true }).selectOption("1");
  await expect(page.getByLabel("Jobs mỗi tick", { exact: true })).toHaveValue("1");
  await expect(read("Chunk / local X/Z")).toHaveText("(-1,-1) / (15.50,15.50)");
  await page.getByLabel("Bán kính tải", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(read("Batch trước: jobs / budget")).toHaveText("1 / 1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(read("Jobs đang chờ")).toHaveText("8");
});
test("Streaming preserves pause, repeated Space prevention and reduced-motion manual work", async ({
  page,
}) => {
  await page.goto(final);
  const canvas = page.getByLabel("Chunk Streaming Lab", { exact: true });
  await canvas.press("Space");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chạy streaming", exact: true })).toBeVisible();
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy streaming", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("2 / 2");
});
