import { expect, test } from "@playwright/test";
const route = "/projects/photon-rain/08-hoan-thien-va-kiem-chung";
test("Photon lab stages scattering and separates preview from statistical samples", async ({
  page,
}) => {
  await page.goto("/projects/photon-rain/01-ve-moi-truong-va-photon");
  await expect(page.getByLabel("muS photon", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Thêm 1 photon", exact: true })).toBeDisabled();
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Đã tính")).toHaveText("0 / 2048");
  await expect(read("Ước lượng / Wilson 95%")).toHaveText("Chưa có dữ liệu");
  await page.getByRole("button", { name: "Thêm 32 photon", exact: true }).click();
  await expect(read("Đã tính")).toHaveText("32 / 2048");
  const convergence = page.getByRole("region", { name: "Đọc độ bất định theo số photon" });
  await expect(convergence.getByRole("img")).toBeVisible();
  await convergence.getByText("Xem số liệu của đồ thị", { exact: true }).click();
  await expect(convergence.locator("tbody tr")).toHaveCount(6);
  await expect(convergence.locator("tbody tr").last().getByRole("rowheader")).toHaveText("32");
  await expect(read("Đã tính")).toHaveText("32 / 2048");
  const counts = await read("Hấp thụ / thoát / chưa biết").textContent();
  await page.getByLabel("ID photon", { exact: true }).press("ArrowLeft");
  await page.getByRole("button", { name: "Về điểm phát", exact: true }).click();
  await expect(read("Đỉnh đang xem")).toContainText("0 /");
  await expect(read("Hấp thụ / thoát / chưa biết")).toHaveText(counts!);
  await page.getByRole("button", { name: "Kiểm hấp thụ thuần", exact: true }).click();
  await expect(read("Audit hấp thụ thuần")).toContainText("PASS");
  await page.getByLabel("Seed photon", { exact: true }).selectOption("2026");
  await expect(read("Đã tính")).toHaveText("0 / 2048");
  await expect(convergence.locator("tbody tr")).toHaveCount(0);
});
test("Photon reduced motion and capped scattering keep unresolved outcomes explicit", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy tiếp", exact: true })).toBeDisabled();
  await page.getByLabel("Preset photon", { exact: true }).selectOption("3");
  await page.getByLabel("Giới hạn tương tác photon", { exact: true }).selectOption("1");
  await page.getByLabel("Photon Rain Lab", { exact: true }).press("n");
  await expect(page.locator(".lab-readout")).toContainText("0 / 0 / 1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Chạy tiếp", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Giới hạn tương tác photon", { exact: true })).toHaveValue("64");
  await expect(page.locator(".lab-readout")).toContainText("0 / 2048");
});
