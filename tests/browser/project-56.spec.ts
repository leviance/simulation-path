import { expect, test } from "@playwright/test";
const finalRoute = "/projects/ct-sinogram/09-kiem-chung-va-hoan-thien";
test("CT lab stages controls and separates stored measurements from preview/display", async ({
  page,
}) => {
  await page.goto("/projects/ct-sinogram/01-ve-phantom-bang-sdl3");
  await expect(page.getByLabel("Góc CT", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Đo một hàng", exact: true })).toBeDisabled();
  await page.goto(finalRoute);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Hàng đã đo")).toHaveText("1 / 120");
  const stored = await read("Giá trị đã lưu").textContent();
  await page.getByLabel("Đảo palette CT", { exact: true }).check();
  await page.getByLabel("Display range CT", { exact: true }).selectOption("4");
  await expect(read("Giá trị đã lưu")).toHaveText(stored!);
  await page.getByLabel("Góc CT", { exact: true }).press("ArrowRight");
  await expect(read("Giá trị đã lưu")).toContainText("Chưa đo");
  await expect(read("Hàng đã đo")).toHaveText("1 / 120");
  await page.getByRole("button", { name: "Đo một hàng", exact: true }).click();
  await expect(read("Hàng đã đo")).toHaveText("2 / 120");
  await page.getByLabel("Strength CT", { exact: true }).press("ArrowRight");
  await expect(read("Hàng đã đo")).toHaveText("0 / 120");
  await page.getByRole("button", { name: "Kiểm phantom tròn", exact: true }).click();
  await expect(read("Oracle hình tròn")).toContainText("PASS");
});
test("CT lab keyboard, resolution reset and reduced motion keep scans bounded", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(finalRoute);
  const canvas = page.getByLabel("CT Sinogram Lab", { exact: true });
  await expect(page.getByRole("button", { name: "Quét tiếp", exact: true })).toBeDisabled();
  await canvas.press("n");
  await expect(page.locator(".lab-readout")).toContainText("2 / 120");
  await page.getByLabel("Số góc CT", { exact: true }).selectOption("30");
  await expect(page.locator(".lab-readout")).toContainText("0 / 30");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Quét tiếp", exact: true })).toBeEnabled();
  await expect(page.locator(".lab-readout")).toContainText("0 / 30");
  await canvas.press("r");
  await expect(page.getByLabel("Số góc CT", { exact: true })).toHaveValue("120");
  await expect(page.locator(".lab-readout")).toContainText("0 / 120");
});
