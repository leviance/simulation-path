import { expect, test } from "@playwright/test";
const route = "/projects/voxel-hidden-faces/03-do-cung-mot-vach";
test("Project 59: final Canvas, keyboard navigation and project-specific observations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 59", { exact: true });
  await expect(canvas).toBeVisible();
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd")
      .first();
  await page.getByLabel("Cảnh mẫu").selectOption("solid");
  await expect(read("Quad đang so")).toHaveText("1536");
  await page.getByRole("button", { name: "Bỏ mặt khuất" }).click();
  await expect(read("Quad đang so")).toHaveText("24576");
  await page.getByRole("button", { name: "Quét góc nhìn" }).click();
  await expect(read("Thời gian cảnh")).not.toHaveText("0.00 s");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Quét góc nhìn" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
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
test("Project 59: early lesson, reduced motion, download and published source", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/voxel-hidden-faces/01-ai-che-mat-da");
  await expect(page.getByLabel("Thực địa voxel 59", { exact: true })).toBeVisible();
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 59", { exact: true });
  await expect(canvas).toBeVisible();

  await expect(page.getByRole("button", { name: "Quét góc nhìn" })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một nhịp" }).click();
  await expect(page.getByText("0.25 s", { exact: true })).toBeVisible();
  const zip = await page.request.get("/downloads/project-59-voxel-hidden-faces.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
