import { expect, test } from "@playwright/test";
const route = "/projects/voxel-ray-editor/03-doc-khong-sua";
test("Project 60: final Canvas, keyboard navigation and project-specific observations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 60", { exact: true });
  await expect(canvas).toBeVisible();
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd")
      .first();
  const hold = page.getByRole("button", { name: "Giữ phép đo" });
  await hold.click();
  const old = await read("Ống ngắm").innerText();
  await canvas.press("ArrowDown");
  await canvas.press("w");
  await expect(read("Ống ngắm")).toHaveText(old);
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Hiện ống ngắm" }).click();
  await expect(read("Ống ngắm")).toHaveText("Đã tắt");
  await canvas.focus();
  await canvas.press("r");
  await expect(page.getByRole("button", { name: "Đặt lại", exact: true }).first()).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw Error("no canvas size");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 8, { steps: 3 });
  await page.mouse.up();
  expect(errors).toEqual([]);
});
test("Project 60: early lesson, reduced motion, download and published source", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/voxel-ray-editor/01-tia-tu-tam-mat");
  await expect(page.getByLabel("Thực địa voxel 60", { exact: true })).toBeVisible();
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 60", { exact: true });
  await expect(canvas).toBeVisible();

  const zip = await page.request.get("/downloads/project-60-voxel-ray-editor.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
