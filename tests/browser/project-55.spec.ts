import { expect, test } from "@playwright/test";
test("X-ray lab gates stages, separates exposure/display and keeps reduced-motion paused", async ({
  page,
}) => {
  await page.goto("/projects/xray-detector/01-anh-detector-dau-tien");
  await expect(page.getByLabel("Midpoint sampling", { exact: true })).toBeDisabled();
  await page.goto("/projects/xray-detector/08-kiem-chung-va-hoan-thien");
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  const ratio = await read("I / I0 = T").textContent(),
    raw = await read("I raw / I0").textContent();
  await page.getByLabel("I0", { exact: true }).press("ArrowRight");
  await expect(read("I / I0 = T")).toHaveText(ratio!);
  await expect(read("I raw / I0")).not.toHaveText(raw!);
  await page.getByLabel("Ảnh log", { exact: true }).check();
  await page.getByLabel("Đảo palette", { exact: true }).check();
  await expect(read("I / I0 = T")).toHaveText(ratio!);
  await page.getByLabel("Midpoint sampling", { exact: true }).check();
  await page.getByLabel("X-ray Detector Lab", { exact: true }).press("m");
  await expect(read("Mẫu đang xem / tổng")).toContainText("1 /");
  await page.getByRole("button", { name: "Kiểm slab và biên", exact: true }).click();
  await expect(read("Audit gần nhất")).toContainText("PASS");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Quay vật thể", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Quay vật thể", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const stopped = await page.getByLabel("Góc vật thể", { exact: true }).inputValue();
  await page.waitForTimeout(350);
  await expect(page.getByLabel("Góc vật thể", { exact: true })).toHaveValue(stopped);
  await page.getByLabel("X-ray Detector Lab", { exact: true }).press("r");
  await expect(page.getByLabel("Midpoint sampling", { exact: true })).not.toBeChecked();
});
