import { expect, test } from "@playwright/test";
const route = "/projects/voxel-sandbox/10-kiem-chung-va-nghiem-thu";

test("sandbox invalidates the previous surface audit after a streaming tick", async ({ page }) => {
  await page.goto(route);
  const result = page
    .locator(".lab-readout div")
    .filter({ has: page.getByText("Kiểm bề mặt", { exact: true }) })
    .locator("dd");
  await page.getByRole("button", { name: "Kiểm bề mặt resident", exact: true }).click();
  await expect(result).toContainText("PASS");
  await expect(result).toContainText("874");
  await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(result).toContainText("Cần kiểm lại");
  await page.getByRole("button", { name: "Kiểm bề mặt resident", exact: true }).click();
  await expect(result).toContainText("PASS");
  await expect(result).toContainText("2494");
});
test("sandbox edits, undoes and imports a versioned snapshot without autosave", async ({
  page,
}) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  for (let n = 0; n < 4; n++)
    await page.getByRole("button", { name: "Một tick", exact: true }).click();
  await expect(read("Resident / job chờ")).toHaveText("9 / 0");
  await expect(read("Hit world")).not.toHaveText("Không hit");
  await expect(read("Hit world")).not.toHaveText("Chunk chưa tải");
  await page.getByRole("button", { name: "Phá một block", exact: true }).click();
  await expect(read("Delta / Undo / Redo")).toHaveText("1 / 1 / 0");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(read("Delta / Undo / Redo")).toHaveText("0 / 0 / 1");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Xuất bản lưu", exact: true }).click();
  const saved = await page.getByLabel("Bản lưu VXL1", { exact: true }).inputValue();
  expect(saved).toMatch(/^VXL1 42 32 3\n1\n/);
  await page.getByRole("button", { name: "Đặt lại (xóa phiên)", exact: true }).click();
  await page.getByLabel("Bản lưu VXL1", { exact: true }).fill(saved);
  await page.getByRole("button", { name: "Nhập bản lưu", exact: true }).click();
  await expect(read("Delta / Undo / Redo")).toHaveText("1 / 0 / 0");
  await expect(read("Resident / job chờ")).toHaveText("1 / 8");
  await expect(page.getByRole("button", { name: "Nhập bản lưu", exact: true })).toBeDisabled();
});
test("sandbox supports manual reduced-motion work and prevents repeated destructive commands", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy tải chunk", exact: true })).toBeDisabled();
  const canvas = page.getByLabel("Voxel Sandbox Lab", { exact: true });
  expect(
    await canvas.evaluate((element) => {
      const event = new KeyboardEvent("keydown", {
        key: "f",
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
  await expect(page.locator(".lab-readout")).toContainText("0 / 0 / 0");
});
