import { expect, test, type Page } from "@playwright/test";

test("Project 38 mounts all twelve pedagogical modes without browser errors", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const lessons = [
    "01-dung-buong-quan-sat-3d",
    "02-state-id-va-seed",
    "03-luc-lorentz-va-euler",
    "04-boris-va-moc-thoi-gian",
    "05-nghiem-doc-lap-va-sai-so-pha",
    "06-capability-ssbo-va-snapshot",
    "07-compute-boris-va-render-ssbo",
    "08-fixed-timestep-va-dieu-khien",
    "09-id-probe-va-vet-quy-dao",
    "10-validation-huu-han",
    "11-benchmark-va-mo-rong-quy-mo",
    "12-hoan-thien-buong-hat-tich-dien",
  ];
  for (const lesson of lessons) {
    await page.goto("/projects/charged-particle-chamber/" + lesson);
    await expect(
      page.getByLabel("Canvas Project 38: buồng hạt tích điện 3D, bản minh họa CPU", {
        exact: true,
      }),
    ).toHaveAttribute("data-render-state", "complete");
  }
  expect(errors).toEqual([]);
  await page
    .getByLabel("Canvas Project 38: buồng hạt tích điện 3D, bản minh họa CPU", { exact: true })
    .screenshot({ path: ".validation/p38-canvas-final.png", timeout: 5000 });
});
const route = "/projects/charged-particle-chamber/12-hoan-thien-buong-hat-tich-dien";
const label = "Canvas Project 38: buồng hạt tích điện 3D, bản minh họa CPU";
const readout = (page: Page, title: string) =>
  page
    .locator(".lab-readout > div")
    .filter({
      has: page.locator("dt").filter({ hasText: new RegExp("^" + title + "$") }),
    })
    .locator("dd");

test("Project 38 distinguishes staged/active, step/reset and CPU sample scale", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const canvas = page.getByLabel(label, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(readout(page, "Quy mô thực trên Canvas")).toContainText("256 hạt CPU");
  await page.getByLabel("Preset chuyển động").selectOption("electric");
  await expect(readout(page, "Trường ACTIVE")).toContainText("0.3500");
  await page.getByRole("button", { name: "Áp dụng và Reset", exact: true }).click();
  await expect(readout(page, "Trường ACTIVE")).toContainText("E=[0.0000, 0.6000, 0.0000]");
  await canvas.focus();
  await canvas.press("n");
  await expect(readout(page, "Trạng thái")).toContainText("tick 1");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(readout(page, "Trạng thái")).toContainText("tick 0");
  await page.getByLabel("Điện trường E x", { exact: true }).fill("99");
  await page.getByRole("button", { name: "Áp dụng và Reset", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Trạng thái đang hợp lệ vẫn được giữ nguyên",
  );
  await expect(readout(page, "Trường ACTIVE")).toContainText("E=[0.0000, 0.6000, 0.0000]");
  expect(errors).toEqual([]);
});

test("Project 38 camera/pointer ownership and reduced motion preserve physics", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  const canvas = page.getByLabel(label, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  const before = await readout(page, "Position / velocity").innerText();
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await canvas.press("+");
  expect(await readout(page, "Position / velocity").innerText()).toBe(before);
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas missing bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(readout(page, "Trạng thái tương tác")).toContainText("đang capture");
  await canvas.dispatchEvent("pointercancel", { pointerId: 999 });
  await expect(readout(page, "Trạng thái tương tác")).toContainText("đang capture");
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
  await page.mouse.up();
  await expect(readout(page, "Trạng thái tương tác")).toContainText("đã nhả");
  expect(await readout(page, "Position / velocity").innerText()).toBe(before);
  await canvas.press("n");
  await expect(readout(page, "Trạng thái")).toContainText("tick 1");
  const dimensions = await canvas.evaluate((c) => ({
    bitmap: (c as HTMLCanvasElement).width,
    css: c.getBoundingClientRect().width,
    dpr: Math.min(3, devicePixelRatio),
  }));
  expect(Math.abs(dimensions.bitmap / dimensions.css - dimensions.dpr)).toBeLessThan(0.03);
});

test("Project 38 reference job completes without claiming GPU coverage and final source is downloadable", async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
    "data-render-state",
    "complete",
  );
  await page.getByRole("button", { name: "Đối chiếu dt và dt/2 (CPU)", exact: true }).click();
  await expect(readout(page, "Đối chiếu CPU hữu hạn")).toContainText("complete:", {
    timeout: 12000,
  });
  await expect(readout(page, "Đối chiếu CPU hữu hạn")).toContainText(
    "không kiểm một triệu state GPU",
  );
  const source = page
    .locator(".checkpoint-source details.source-file")
    .filter({
      has: page.locator("summary code").filter({ hasText: "include/chamber_math.hpp" }),
    })
    .first();
  await source.locator("summary").click();
  await expect(source.locator(".highlighted-code")).toContainText("stepBoris");
  await expect(
    page.locator("a[href='/downloads/project-38-charged-particle-chamber.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
