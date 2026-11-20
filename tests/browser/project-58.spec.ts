import { expect, test } from "@playwright/test";
const route = "/projects/voxel-chunk/07-kiem-chung-va-hoan-thien";
test("The work file explains where to put the first stone without opening the solution", async ({
  page,
}) => {
  await page.goto("/projects/voxel-chunk/01-ve-cube-dau-tien");
  const file = page
    .locator("details.source-file")
    .filter({ has: page.locator("summary", { hasText: "work/include/trail/scene.hpp" }) });
  await file.locator("summary").first().click();
  await expect(file.getByText(/solids = 0;/).first()).toBeVisible();
  await expect(
    file.locator(".highlighted-code").filter({ hasText: "appendCube(mesh" }).first(),
  ).toBeVisible();
  await expect(file.locator(".highlighted-code").first()).not.toContainText(
    "project_58_checkpoint",
  );
  await file.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(file).not.toHaveAttribute("open", "");
});
test("Project 58: final Canvas, keyboard navigation and project-specific observations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route);
  const canvas = page.getByLabel("Bờ suối nhìn từ camera", { exact: true });
  await expect(canvas).toBeVisible();
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd")
      .first();
  await page.getByLabel("Cảnh mẫu").selectOption("solid");
  await expect(read("Tam giác của mesh")).toHaveText("49152");
  await page.getByLabel("Cảnh mẫu").selectOption("empty");
  await expect(read("Block đặc")).toHaveText("0");
  await page.getByRole("button", { name: "Kiểm chứng", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "49.152" })).toBeVisible();
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
test("Project 58: early lesson, reduced motion, download and published source", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/voxel-chunk/01-ve-cube-dau-tien");
  await expect(page.getByLabel("Bờ suối nhìn từ camera", { exact: true })).toBeVisible();
  await page.goto(route);
  const canvas = page.getByLabel("Bờ suối nhìn từ camera", { exact: true });
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("button", { name: "Quan sát tự động", exact: true })).toBeDisabled();
  const zip = await page.request.get("/downloads/project-58-voxel-chunk.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
