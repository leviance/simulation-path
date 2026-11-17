import { expect, test } from "@playwright/test";
test("Trilinear lesson exposes eight weights and the worked numerical example", async ({
  page,
}) => {
  await page.goto("/projects/volume-slicer/05-noi-suy-giua-cac-lat");
  await expect(page.locator("[data-volume53-ready]")).toHaveAttribute(
    "data-volume53-ready",
    "true",
  );
  const inspector = page.getByRole("region", { name: "Tám voxel và trọng số trilinear" });
  await expect(inspector.locator("tbody tr")).toHaveCount(8);
  await expect(page.getByLabel("Kết quả ô trilinear")).toHaveText("0.52500");
  await page.getByLabel("Trilinear fx", { exact: true }).press("ArrowRight");
  await expect(page.getByLabel("Kết quả ô trilinear")).toHaveText("0.53000");
  await page.getByRole("button", { name: "Đặt lại ô mẫu", exact: true }).click();
  await expect(page.getByLabel("Kết quả ô trilinear")).toHaveText("0.52500");
});
test("Volume lab gates chapters, preserves raw scalar under contrast and coordinates three planes", async ({
  page,
}) => {
  await page.goto("/projects/volume-slicer/01-lat-cat-dau-tien");
  await expect(page.locator("[data-volume53-ready]")).toHaveAttribute(
    "data-volume53-ready",
    "true",
  );
  await expect(page.getByLabel("Trilinear", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeDisabled();
  await page.goto("/projects/volume-slicer/07-kiem-chung-va-hoan-thien");
  await expect(page.locator("[data-volume53-ready]")).toHaveAttribute(
    "data-volume53-ready",
    "true",
  );
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await page.getByText("Voxel inspector — tọa độ, địa chỉ và sampling", { exact: true }).click();
  const scalar = await readout("Scalar tại world point").textContent();
  await page.getByLabel("Level", { exact: true }).press("ArrowRight");
  await expect(readout("Scalar tại world point")).toHaveText(scalar!);
  await page.getByLabel("Độ phân giải volume", { exact: true }).selectOption("128");
  await expect(readout("Voxel grid / bộ nhớ")).toContainText("2,097,152");
  await page.getByLabel("Lát XY", { exact: true }).press("Home");
  await expect(readout("World point x/y/z")).toContainText("-2.3813");
  await page.getByLabel("Dataset", { exact: true }).selectOption("ramp");
  await page.getByLabel("Trilinear", { exact: true }).check();
  await page.getByLabel("Mặt cắt", { exact: true }).selectOption("1");
  await expect(readout("Mặt cắt / trục giữ cố định")).toContainText("XZ");
  const before = await readout("World point x/y/z").textContent();
  await page.getByLabel("Volume Slice Lab", { exact: true }).press("Control+ArrowRight");
  await expect(readout("World point x/y/z")).toHaveText(before!);
  const canvas = page.getByLabel("Volume Slice Lab", { exact: true });
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + 150);
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, -120);
  await expect
    .poll(async () =>
      Number((await readout("Camera yaw/pitch/distance").textContent())!.split(";")[2]),
    )
    .toBeCloseTo(6.9 * Math.exp(-0.24), 3);
  await expect(readout("World point x/y/z")).toHaveText(before!);
  await page.getByLabel("Volume Slice Lab", { exact: true }).press("ArrowRight");
  await expect(readout("World point x/y/z")).not.toHaveText(before!);
  await page.getByRole("button", { name: "Kiểm volume và nội suy", exact: true }).click();
  await expect(readout("Audit lần gần nhất")).toContainText("PASS");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Quét lát", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dừng", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Quét lát", exact: true })).toBeEnabled();
  const stopped = await readout("World point x/y/z").textContent();
  await page.waitForTimeout(200);
  await expect(readout("World point x/y/z")).toHaveText(stopped!);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue("ramp");
  await expect(page.getByLabel("Độ phân giải volume", { exact: true })).toHaveValue("128");
  await expect(readout("World point x/y/z")).toHaveText("0.0000; 0.0000; 0.0000");
});
