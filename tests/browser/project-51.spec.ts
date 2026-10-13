import { expect, test } from "@playwright/test";
test("SPH3D lab gates physics,plans large workloads without allocation and validates CPU independently", async ({
  page,
}) => {
  await page.goto("/projects/sph-water-gpu/01-khoi-hat-va-camera");
  await expect(page.getByRole("button", { name: "Tiến một tick", exact: true })).toBeDisabled();
  await page.goto("/projects/sph-water-gpu/12-kiem-chung-va-hoan-thien");
  const value = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Kế hoạch GPU", { exact: true }).selectOption("100");
  await expect(value("Kế hoạch GPU — không cấp phát")).toContainText("1,000,000");
  await expect(value("Số hạt CPU / tổng mass")).toHaveText("64 / 64.000000 kg");
  const canvas = page.getByLabel("SPH3D CPU oracle", { exact: true });
  await canvas.press("n");
  await expect(value("Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Kiểm oracle CPU", exact: true }).click();
  await expect(value("Oracle CSR CPU")).toContainText("PASS");
  await expect(value("Tick")).toHaveText("1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(value("Tick")).not.toHaveText("1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  const tick = await value("Tick").textContent();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeEnabled();
  await page.waitForTimeout(200);
  await expect(value("Tick")).toHaveText(tick!);
});
