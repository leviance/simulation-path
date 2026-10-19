import { expect, test, type Page } from "@playwright/test";
const route = "/projects/rotating-triangle/08-hoan-thien-va-kiem-chung";
const read = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
test("P12 normal changes with order, reduced-motion permits step and clean mode hides overlays", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await page.getByLabel("Tam giác mẫu", { exact: true }).selectOption("2");
  const before = await read(page, "unit normal").textContent();
  await page.getByLabel("Rotation order", { exact: true }).selectOption("zyx");
  await expect(read(page, "unit normal")).not.toHaveText(before!);
  await expect(page.getByRole("button", { name: "Tự quay", exact: true })).toBeDisabled();
  const angles = await read(page, "pitch / yaw / roll").textContent();
  await page.getByRole("button", { name: "Tiến 0.1 s", exact: true }).click();
  await expect(read(page, "pitch / yaw / roll")).not.toHaveText(angles!);
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  for (const label of ["edge-length error", "round-trip error", "normal rotation error"])
    expect(Number(await read(page, label).textContent())).toBeLessThan(1e-9);
});
test("P12 press does not jump, captured drag changes angles and Q/E/Tab remain accessible", async ({
  page,
}) => {
  await page.goto(route);
  const canvas = page.locator('canvas[aria-label^="Tam giác 3D perspective"]');
  await expect(canvas).toHaveAttribute("height", /\d+/);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("No rotation canvas");
  const before = await read(page, "pitch / yaw / roll").textContent();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await expect(read(page, "pitch / yaw / roll")).toHaveText(before!);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await page.mouse.up();
  await expect(read(page, "pitch / yaw / roll")).not.toHaveText(before!);
  const current = await read(page, "pitch / yaw / roll").textContent();
  await canvas.focus();
  await canvas.press("e");
  await expect(read(page, "pitch / yaw / roll")).not.toHaveText(current!);
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});
