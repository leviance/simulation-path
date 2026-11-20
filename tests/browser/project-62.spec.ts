import { expect, test } from "@playwright/test";
const route = "/projects/voxel-chunk-streaming/04-di-xa-va-quay-lai";
test("Project 62: final Canvas, keyboard navigation and project-specific observations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 62", { exact: true });
  await expect(canvas).toBeVisible();
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd")
      .first();
  await page.getByRole("button", { name: "Sang chunk âm X" }).click();
  await expect(read("Chunk tâm")).toHaveText("-1, 0");
  await page.getByLabel("Ngân sách").selectOption("2");
  for (let i = 0; i < 13; i++) await page.getByRole("button", { name: "Tiến một nhịp" }).click();
  await expect(read("Đã nạp")).toHaveText("25");
  await expect(read("Chờ nạp")).toHaveText("0");
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
test("Project 62: early lesson, reduced motion, download and published source", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/voxel-chunk-streaming/01-nap-quanh-mat");
  await expect(page.getByLabel("Thực địa voxel 62", { exact: true })).toBeVisible();
  await page.goto(route);
  const canvas = page.getByLabel("Thực địa voxel 62", { exact: true });
  await expect(canvas).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cho thời gian chạy", exact: true }),
  ).toBeDisabled();
  const zip = await page.request.get("/downloads/project-62-voxel-chunk-streaming.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
