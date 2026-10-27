import { expect, test } from "@playwright/test";

test("P31 renders the real galaxy, steps every body, restores camera and sweeps the same snapshot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/projects/barnes-hut-nbody/10-hoan-thien-barnes-hut-n-body");
  const canvas = page.getByRole("img", { name: "Thiên hà N-body 3D bằng Barnes–Hut", exact: true });
  await expect(canvas).toBeVisible();
  await expect(page.locator('[data-galaxy-controls-ready="true"]')).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        (element) =>
          (element as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const clock = page
    .getByText("N / step / thời gian mô phỏng", { exact: true })
    .locator("..")
    .locator("dd");
  await expect(clock).toContainText("4096 / 0 /");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(clock).toContainText("4096 / 1 /", { timeout: 15000 });
  await canvas.scrollIntoViewIfNeeded();
  const before = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  const box = await canvas.boundingBox();
  if (!box) throw Error("Galaxy canvas has no bounds");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.up();
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .not.toBe(before);
  expect(
    await canvas.evaluate((element) =>
      Array.from({ length: 10 }, (_, id) => element.hasPointerCapture(id)).some(Boolean),
    ),
  ).toBe(false);
  await canvas.press("Home");
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .toBe(before);
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.6);
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .not.toBe(before);
  await canvas.press("Escape");
  await page.mouse.up();
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .toBe(before);
  await expect(clock).toContainText("4096 / 1 /");
  const board = page.locator("[data-galaxy-distance]");
  await canvas.hover();
  for (let i = 0; i < 24; i++) await page.mouse.wheel(0, -100);
  await expect
    .poll(async () => Number(await board.getAttribute("data-galaxy-distance")))
    .toBeLessThan(0);
  await expect(clock).toContainText("4096 / 1 /");
  await canvas.press("Home");
  await expect(board).toHaveAttribute("data-galaxy-distance", "2.6000");
  await page.getByRole("button", { name: "Hiện node debug", exact: true }).click();
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .not.toBe(before);
  await page.getByRole("button", { name: "Ẩn node debug", exact: true }).click();
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
    .toBe(before);
  await page.getByRole("button", { name: "Kiểm cây và self-force", exact: true }).click();
  await expect(page.getByText(/zeroSelfForce: đạt/)).toBeVisible();
  await page.getByRole("button", { name: "Đo sai số theo theta", exact: true }).click();
  const results = page.getByRole("region", { name: "Kết quả thí nghiệm N-body", exact: true });
  await expect(results).toContainText("4/4 giá trị θ hoàn tất", { timeout: 15000 });
  await expect(results.locator("tbody tr")).toHaveCount(4);
  await expect(clock).toContainText("4096 / 1 /");
  await page.getByLabel("Preset thiên hà", { exact: true }).selectOption("1");
  await expect(clock).toContainText("4096 / 0 /");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(clock).toContainText("4096 / 1 /", { timeout: 15000 });
  expect(errors).toEqual([]);
});

test("P31 first lesson keeps later controls hidden; reduced motion still permits finite steps", async ({
  page,
}) => {
  await page.goto("/projects/barnes-hut-nbody/01-thien-ha-va-trang-thai-body");
  await expect(
    page.getByRole("img", { name: "Thiên hà N-body 3D bằng Barnes–Hut", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Theta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chạy scaling study", exact: true })).toHaveCount(
    0,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/barnes-hut-nbody/10-hoan-thien-barnes-hut-n-body");
  await expect(page.getByRole("button", { name: "Chạy mô phỏng", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(
    page.getByText("N / step / thời gian mô phỏng", { exact: true }).locator("..").locator("dd"),
  ).toContainText("4096 / 1 /", { timeout: 15000 });
});
