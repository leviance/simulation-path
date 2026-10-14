import { expect, test } from "@playwright/test";
test("Ray lab gates picking, handles inside surface range and reduced motion persistently", async ({
  page,
}) => {
  await page.goto("/projects/ray-intersections/01-canh-3d");
  await expect(page.getByRole("button", { name: "Quét tia", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Preset camera", { exact: true })).toBeDisabled();
  await page.goto("/projects/ray-intersections/08-kiem-chung-va-hoan-thien");
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByLabel("Preset camera", { exact: true }).selectOption("2");
  await expect(readout("Gần nhất")).toContainText("Box");
  const range = page.getByLabel("tMax", { exact: true });
  await range.press("Home");
  for (let i = 0; i < 4; i++) await range.press("ArrowRight");
  await expect(readout("Box — t / point")).toHaveText("MISS");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Thí nghiệm tia", { exact: true }).selectOption("tangent");
  await expect(readout("Sphere — t / point")).toContainText("3.000000");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByLabel("Ray Intersection Lab", { exact: true }).press("ArrowRight");
  await page.getByRole("button", { name: "Kiểm hit hiện tại", exact: true }).click();
  await expect(readout("Lần kiểm gần nhất")).toContainText("PASS");
  await expect(readout("Direction / độ dài")).toContainText("1.000000");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Quét tia", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Quét tia", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Quét tia", exact: true })).toBeEnabled();
  const direction = await readout("Direction / độ dài").textContent();
  await page.waitForTimeout(200);
  await expect(readout("Direction / độ dài")).toHaveText(direction!);
});
