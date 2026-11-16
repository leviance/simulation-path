import { expect, test } from "@playwright/test";
const readout = (page: import("@playwright/test").Page, label: string) =>
  page
    .locator(".lab-readout div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd")
    .first();

test("P51 first checkpoint gates physics and exposes highlighted complete source", async ({
  page,
}) => {
  await page.goto("/projects/sph-water-gpu/01-khoi-hat-va-camera");
  await expect(page.locator('[data-sph3-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiến một tick", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await expect(page.locator('.prose [data-theme="one-dark-pro"]').first()).toBeVisible();
  await expect(page.locator(".checkpoint-source")).toBeVisible();
  await expect(readout(page, "Số hạt CPU / tổng mass")).toHaveText("64 / 64.000000 kg");
});

test("P51 force experiment exposes pressure and dissipative viscosity before motion", async ({
  page,
}) => {
  await page.goto("/projects/sph-water-gpu/06-pressure-va-viscosity");
  await expect(page.locator('[data-sph3-ready="true"]')).toBeVisible();
  const pressure = await readout(page, "Density / pressure hạt chọn").textContent();
  expect(Number(pressure!.split(" / ")[1])).toBeGreaterThan(0);
  await expect(readout(page, "Acceleration hạt chọn")).not.toHaveText(
    "(0.000000; 0.000000; 0.000000)",
  );
  await page.getByLabel("Thí nghiệm lực", { exact: true }).selectOption("separating");
  await expect(readout(page, "Acceleration hạt chọn")).toHaveText("(0.000000; 0.000000; 0.000000)");
  await page.getByLabel("Thí nghiệm lực", { exact: true }).selectOption("approaching");
  await expect(readout(page, "Acceleration hạt chọn")).not.toHaveText(
    "(0.000000; 0.000000; 0.000000)",
  );
  await page.getByLabel("Artificial viscosity alpha", { exact: true }).selectOption("0");
  await expect(readout(page, "Acceleration hạt chọn")).toHaveText("(0.000000; 0.000000; 0.000000)");
  await expect(readout(page, "Tick")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Tiến một tick", exact: true })).toBeDisabled();
});

test("P51 final keeps the Canvas CPU oracle separate from the GPU workload plan", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/sph-water-gpu/12-kiem-chung-va-hoan-thien");
  await expect(page.locator('[data-sph3-ready="true"]')).toBeVisible();
  const canvas = page.getByLabel("SPH3D CPU oracle", { exact: true });
  await canvas.press("n");
  await expect(readout(page, "Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Kiểm oracle CPU", exact: true }).click();
  await expect(readout(page, "Oracle CSR CPU")).toContainText("PASS");
  await expect(readout(page, "Tick")).toHaveText("1");
  await page.getByLabel("Kế hoạch GPU", { exact: true }).selectOption("100");
  await expect(readout(page, "Kế hoạch GPU — không cấp phát")).toContainText("1,000,000");
  await expect(readout(page, "Số hạt CPU / tổng mass")).toHaveText("64 / 64.000000 kg");
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await expect(page.locator(".complete-project-source")).toBeVisible();
  const download = page.getByRole("link", { name: /Tải ZIP Dự án/i }).first();
  await expect(download).toHaveAttribute("href", "/downloads/project-51-sph-water-gpu.zip");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(readout(page, "Tick")).not.toHaveText("1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  const paused = await readout(page, "Tick").textContent();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeEnabled();
  await page.waitForTimeout(200);
  await expect(readout(page, "Tick")).toHaveText(paused!);
  expect(errors).toEqual([]);
});

test("P51 Canvas captured orbit, keyboard selection and reset preserve physics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/sph-water-gpu/12-kiem-chung-va-hoan-thien");
  await expect(page.locator('[data-sph3-ready="true"]')).toBeVisible();
  const canvas = page.getByLabel("SPH3D CPU oracle", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const before = await readout(page, "Position hạt chọn").textContent();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.4, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(readout(page, "Position hạt chọn")).toHaveText(before!);
  await canvas.press("ArrowRight");
  await expect(readout(page, "Position hạt chọn")).not.toHaveText(before!);
  await canvas.press("n");
  await expect(readout(page, "Tick")).toHaveText("1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(readout(page, "Tick")).toHaveText("0");
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto("/projects/sph-water-gpu");
  expect(errors).toEqual([]);
});

test("P51 lesson progress and dark theme survive local navigation and reload", async ({ page }) => {
  await page.goto("/projects/sph-water-gpu/01-khoi-hat-va-camera");
  await expect(page.locator('[data-sph3-ready="true"]')).toBeVisible();
  const dark = page.getByRole("button", { name: "Chuyển sang giao diện tối", exact: true });
  if (await dark.isVisible()) await dark.click();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/projects/sph-water-gpu/02-ssbo-va-khoi-tao");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
