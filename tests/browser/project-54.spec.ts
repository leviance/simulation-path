import { expect, test } from "@playwright/test";
test("Volume march gates stages and supports keyboard/reset/reduced-motion without auto resume", async ({
  page,
}) => {
  await page.goto("/projects/volume-ray-marching/01-fullscreen-fragment");
  await expect(page.getByLabel("Dataset", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tiến một mẫu", exact: true })).toBeDisabled();
  await page.goto("/projects/volume-ray-marching/09-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Dataset", { exact: true }).selectOption("2");
  await page.getByLabel("Volume Ray Marching Lab", { exact: true }).press("n");
  await expect(readout("Mẫu đã xem / tổng")).toContainText("1 /");
  const before = (await readout("T hiện tại / cuối").textContent())!.split(" / ")[1];
  await page.getByLabel("Transfer màu warm", { exact: true }).uncheck();
  const after = (await readout("T hiện tại / cuối").textContent())!.split(" / ")[1];
  expect(after).toBe(before);
  await expect(readout("Mẫu đã xem / tổng")).toContainText("0 /");
  await page.getByLabel("Camera trong volume", { exact: true }).check();
  await expect(readout("Entry / exit")).toContainText("0.000000 /");
  await page.getByLabel("Sigma", { exact: true }).press("ArrowRight");
  await page.getByLabel("Step length", { exact: true }).selectOption("0.04");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const stopped = await readout("Mẫu đã xem / tổng").textContent();
  await page.waitForTimeout(250);
  await expect(readout("Mẫu đã xem / tổng")).toHaveText(stopped!);
  await page.getByLabel("Volume Ray Marching Lab", { exact: true }).press("r");
  await expect(page.getByLabel("Camera trong volume", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue("0");
  await expect(readout("Mẫu đã xem / tổng")).toContainText("0 /");
});
