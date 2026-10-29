import { expect, test, type Page } from "@playwright/test";

const finalRoute = "/projects/million-vector-gpu/11-kiem-chung-va-ban-hoan-chinh";
const canvasLabel = "Canvas Project 37: Vec4, workgroup và phạm vi đo compute";
const readout = (page: Page, label: string) =>
  page
    .locator(".lab-readout > div")
    .filter({
      has: page.locator("dt").filter({ hasText: new RegExp("^" + label + "$") }),
    })
    .locator("dd");

test("Project 37 selects the actual two-dimensional lane grid and respects pointer ownership", async ({
  page,
}) => {
  await page.goto("/projects/million-vector-gpu/05-dispatch-hon-mot-trieu-vector");
  const canvas = page.getByLabel(canvasLabel, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(readout(page, "Dispatch plan")).toContainText("189 lane dư");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw Error("Canvas has no bounding box");
  const cell = Math.min(
    24,
    (Math.round(bounds.width) - 60) / 16,
    (Math.round(bounds.height) - 95) / 16,
  );
  const point = (lane: number) => ({
    x: bounds.x + (Math.round(bounds.width) - 16 * cell) / 2 + ((lane % 16) + 0.5) * cell,
    y: bounds.y + 44 + (Math.floor(lane / 16) + 0.5) * cell,
  });
  await canvas.evaluate((element) =>
    element.addEventListener(
      "pointerdown",
      (event) => {
        (element as HTMLCanvasElement).dataset.testOwner = String(
          (event as PointerEvent).pointerId,
        );
      },
      { once: true },
    ),
  );
  await page.mouse.move(point(66).x, point(66).y);
  await page.mouse.down();
  await expect(readout(page, "Invocation được chọn")).toContainText("local 66 · global 1000002");
  await canvas.dispatchEvent("pointerup", { pointerId: 999, isPrimary: false, button: 0 });
  await expect(readout(page, "Trạng thái tương tác")).toContainText("đang capture");
  await page.mouse.move(point(67).x, point(67).y);
  await expect(readout(page, "Invocation được chọn")).toContainText("return trước mọi lần đọc/ghi");
  const owner = Number(await canvas.getAttribute("data-test-owner"));
  await canvas.dispatchEvent("pointercancel", { pointerId: owner, isPrimary: true, button: 0 });
  await expect(readout(page, "Trạng thái tương tác")).toContainText("đã nhả");
  expect(
    await canvas.evaluate(
      (element, id) => (element as HTMLCanvasElement).hasPointerCapture(id),
      owner,
    ),
  ).toBe(false);
  await page.mouse.up();
  await canvas.focus();
  await canvas.press("Home");
  await expect(readout(page, "Invocation được chọn")).toContainText("local 0");
  await page.getByLabel("Local size minh họa", { exact: true }).selectOption("32");
  await expect(readout(page, "Dispatch plan")).toContainText("29 lane dư");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Local size minh họa", { exact: true })).toHaveValue("256");
});

test("Project 37 timing scopes have no fabricated measurements and reduced motion keeps manual stepping", async ({
  page,
}) => {
  await page.goto("/projects/million-vector-gpu/08-do-thoi-gian-gpu-dung-cach");
  const canvas = page.getByLabel(canvasLabel, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await page.getByLabel("Phạm vi đo", { exact: true }).selectOption("end-to-end");
  await expect(readout(page, "Phạm vi đo đang xem")).toContainText("readback N+256");
  await expect(readout(page, "Phạm vi đo đang xem")).toContainText("fence wait");
  await expect(readout(page, "Mô tả thay thế")).toContainText(
    "không phải phép đo GPU của trình duyệt",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy lần lượt", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Một bước", exact: true }).click();
  await expect(readout(page, "Trạng thái tương tác")).toContainText("bước 1");
  await canvas.focus();
  await canvas.press(" ");
  await expect(readout(page, "Trạng thái tương tác")).toContainText("Đã dừng");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Chạy lần lượt", exact: true }).click();
  await expect(readout(page, "Trạng thái tương tác")).toContainText("bước 6");
  await expect(page.getByRole("button", { name: "Chạy lần lượt", exact: true })).toBeEnabled();
  await page.goto("/projects/million-vector-gpu/06-memory-barrier-va-readback");
  await page.getByLabel("Thí nghiệm barrier", { exact: true }).selectOption("missing");
  await expect(readout(page, "Visibility và completion")).toContainText(
    "có thể tình cờ trông đúng",
  );
});

test("Project 37 inspector, error probes, DPR and complete source remain usable", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByLabel(canvasLabel, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await canvas.focus();
  await canvas.press("End");
  await expect(page.getByRole("spinbutton", { name: "Index đang xem", exact: true })).toHaveValue(
    "1000002",
  );
  await page.getByLabel("Preset N", { exact: true }).selectOption("256");
  await expect(page.getByRole("spinbutton", { name: "Index đang xem", exact: true })).toHaveValue(
    "255",
  );
  await page.getByLabel("Component", { exact: true }).selectOption("3");
  await page.getByLabel("Lỗi cố ý", { exact: true }).selectOption("nan");
  await expect(readout(page, "Kiểm mẫu, không kiểm toàn mảng")).toContainText("FAIL");
  await expect(readout(page, "Kiểm mẫu, không kiểm toàn mảng")).toContainText("component lỗi w");
  await page.getByLabel("Lỗi cố ý", { exact: true }).selectOption("nan-tolerance");
  await expect(readout(page, "Kiểm mẫu, không kiểm toàn mảng")).toContainText(
    "tolerance không hợp lệ",
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(readout(page, "Kiểm mẫu, không kiểm toàn mảng")).toContainText("PASS");
  await expect(page.getByRole("spinbutton", { name: "Index đang xem", exact: true })).toHaveValue(
    "0",
  );
  const bitmap = await canvas.evaluate((element) => ({
    bitmap: (element as HTMLCanvasElement).width,
    css: element.getBoundingClientRect().width,
    dpr: devicePixelRatio,
  }));
  expect(Math.abs(bitmap.bitmap / bitmap.css - bitmap.dpr)).toBeLessThan(0.02);
  const source = page
    .locator(".checkpoint-source details.source-file")
    .filter({
      has: page.locator("summary code").filter({ hasText: "include/vector_compute_engine.hpp" }),
    })
    .first();
  await source.locator("summary").click();
  await expect(source.locator(".highlighted-code")).toContainText("timerPending_");
  await expect(
    page.locator("a[href='/downloads/project-37-million-vector-gpu.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
});
