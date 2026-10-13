import { expect, test } from "@playwright/test";

const cases = [
  {
    project: 46,
    route: "falling-sand/07-kiem-chung-va-hoan-thien",
    step: "Tiến một tick",
    label: "Tick",
  },
  {
    project: 47,
    route: "heat-plate/08-kiem-chung-va-ban-hoan-chinh",
    step: "Tiến một bước",
    label: "Tick",
  },
  {
    project: 48,
    route: "wind-map/09-kiem-chung-va-hoan-thien",
    step: "Tiến một bước",
    label: "Tick",
  },
  {
    project: 49,
    route: "stable-fluids/11-kiem-chung-va-hoan-thien",
    step: "Tiến một bước",
    label: "Tick",
  },
  {
    project: 50,
    route: "sph-water/10-kiem-chung-va-hoan-thien",
    step: "Tiến một bước",
    label: "Thời gian mô phỏng",
  },
];
for (const fixture of cases) {
  test(`Project ${fixture.project} stays paused after leaving reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/projects/" + fixture.route);
    const value = page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(fixture.label, { exact: true }) })
      .locator("dd");
    const initial = await value.textContent();
    await page.getByRole("button", { name: "Chạy", exact: true }).click();
    await expect(value).not.toHaveText(initial!);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
    const paused = await value.textContent();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeEnabled();
    await page.waitForTimeout(250);
    await expect(value).toHaveText(paused!);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: fixture.step, exact: true }).click();
    await expect(value).not.toHaveText(paused!);
    const stepped = await value.textContent();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeEnabled();
    await page.waitForTimeout(250);
    await expect(value).toHaveText(stepped!);
    await page.getByRole("button", { name: "Chạy", exact: true }).click();
    await expect(value).not.toHaveText(stepped!);
    await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  });
}
