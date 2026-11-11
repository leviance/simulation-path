import { expect, test } from "@playwright/test";
const canvasName = "Canvas Project 40: xưởng vải 3D, mẫu CPU XPBD";
const finalRoute = "/projects/cloth-workshop/14-xuong-vai-hoan-chinh";

test("Project 40 opens the new lessons directly from the roadmap", async ({ page }) => {
  await page.goto("/roadmap");
  const entry = page.locator("#project-40");
  await expect(entry).toHaveAttribute("href", "/projects/cloth-workshop");
  await expect(entry).toContainText("14 bài");
  await expect(entry).not.toContainText("CHỜ NGHIỆM THU");
  await entry.click();

  await expect(page).toHaveURL(/\/projects\/cloth-workshop$/);
  await expect(page.getByRole("heading", { level: 1, name: /Xưởng vải 3D/ })).toBeVisible();
  await expect(page.getByLabel("Chờ nghiệm thu", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Nội dung thuộc bản cũ", { exact: true })).toHaveCount(0);

  const lessons = page.getByRole("navigation", { name: "Các bài của Dự án 40" });
  await expect(lessons.getByRole("link")).toHaveCount(14);
  await lessons.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/projects\/cloth-workshop\/01-mat-vai-dau-tien$/);
  await expect(page.locator(".lesson-hero").getByRole("heading", { level: 1 })).toContainText(
    "Dựng mặt vải đầu tiên",
  );
});

test("Project 40 cloth has real CPU surface, keyboard pin/step, deterministic reset and DPR", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(finalRoute);
  const canvas = page.getByLabel(canvasName, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(
    page.getByRole("group", { name: "Điều khiển xưởng vải 3D", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Chạy vải", exact: true })).toBeDisabled();
  const initial = await page.getByTestId("cloth-probe").textContent();
  await page.getByRole("button", { name: "Một bước", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-tick", "1");
  await expect(page.getByTestId("cloth-probe")).not.toHaveText(initial!);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-tick", "0");
  await expect(page.getByTestId("cloth-probe")).toHaveText(initial!);
  await page.getByRole("button", { name: "Ghim/bỏ ghim ID", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ghim/bỏ ghim ID", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const pinned = await page.getByTestId("cloth-probe").textContent();
  await page.getByRole("button", { name: "Một bước", exact: true }).click();
  // Cell/velocity/XYZ of a pin remain unchanged even when the surrounding mesh moves.
  await expect(page.getByTestId("cloth-probe")).toHaveText(pinned!);
  await page.getByLabel("Preset vải", { exact: true }).selectOption("drape");
  await page.getByLabel("Lưới CPU mẫu", { exact: true }).selectOption("25");
  await expect(page.getByText("625 / 0", { exact: true })).toBeVisible();
  const dimensions = await canvas.evaluate((element) => ({
    bitmap: (element as HTMLCanvasElement).width,
    css: element.getBoundingClientRect().width,
    dpr: Math.min(3, devicePixelRatio),
  }));
  expect(Math.abs(dimensions.bitmap / dimensions.css - dimensions.dpr)).toBeLessThan(0.03);
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await canvas.press("Shift+ArrowUp");
  await canvas.press("+");
  await canvas.press("Backspace");
  expect(errors).toEqual([]);
});

test("Project 40 capture has one owner, cloth drag differs from camera, blur/reset release safely", async ({
  page,
}) => {
  await page.goto("/projects/cloth-workshop/12-ghim-keo-va-vong-doi");
  const canvas = page.getByLabel(canvasName, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await page.getByRole("button", { name: "Kéo vùng vải", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  // Find the uniquely pale selected-ID marker in the actual rendered surface.
  const point = await canvas.evaluate((element) => {
    const c = element as HTMLCanvasElement,
      data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let sx = 0,
      sy = 0,
      count = 0;
    for (let y = 25; y < c.height - 70; y++)
      for (let x = 0; x < c.width; x++) {
        const p = 4 * (y * c.width + x);
        if (data[p] === 228 && data[p + 1] === 250 && data[p + 2] === 246) {
          sx += x;
          sy += y;
          count++;
        }
      }
    if (!count) throw Error("Selected cloth marker is not visible");
    return {
      x: ((sx / count) * c.clientWidth) / c.width,
      y: ((sy / count) * c.clientHeight) / c.height,
    };
  });
  await canvas.evaluate((element) =>
    element.addEventListener(
      "pointerdown",
      (event) => {
        element.dataset.testPointer = String((event as PointerEvent).pointerId);
      },
      { once: true },
    ),
  );
  const box = await canvas.boundingBox();
  if (!box) throw Error("Missing cloth canvas bounds");
  await page.mouse.move(box.x + point.x, box.y + point.y);
  await page.mouse.down();
  const captured = () =>
    canvas.evaluate((element) => element.hasPointerCapture(Number(element.dataset.testPointer)));
  await expect.poll(captured).toBe(true);
  await canvas.dispatchEvent("pointercancel", { pointerId: 999 });
  await expect.poll(captured).toBe(true);
  const before = await page.getByTestId("cloth-probe").textContent();
  await page.mouse.move(box.x + point.x + 55, box.y + point.y - 30);
  await expect(page.getByTestId("cloth-probe")).toHaveText(before!);
  await page.keyboard.press("n");
  await expect(page.getByTestId("cloth-probe")).not.toHaveText(before!);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(captured).toBe(false);
  await page.mouse.up();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-tick", "0");
});

test("Project 40 CSR exposes real counts and finite CPU oracle can complete or cancel", async ({
  page,
}) => {
  // Install before navigation so existing RAF handles are also owned by the test clock.
  const clockStart = new Date("2026-11-08T00:00:00Z");
  await page.clock.install({ time: clockStart });
  await page.goto("/projects/cloth-workshop/09-csr-count-scan-scatter");
  const canvas = page.getByLabel(canvasName, { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(page.getByRole("columnheader", { name: "Offset begin", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kiểm CPU 12 fixture", exact: true }).click();
  await expect(
    page.getByText(
      "Oracle CPU PASS 12/12: CSR, contact IDs và penetration mẫu hiện tại. Không đo/kiểm GPU.",
      { exact: true },
    ),
  ).toBeVisible();
  // First prove natural completion. Then freeze RAF before starting a separate cancel job;
  // browser actionability/scroll latency must not race the twelve-frame product workload.
  await page.clock.pauseAt(new Date(clockStart.getTime() + 120_000));
  try {
    const run = page.getByRole("button", { name: "Kiểm CPU 12 fixture", exact: true });
    const cancel = page.getByRole("button", { name: "Hủy kiểm CPU", exact: true });
    await run.click();
    await expect(cancel).toBeEnabled();
    await expect(run).toBeDisabled();
    await expect(
      page.getByRole("progressbar", { name: "Tiến độ oracle CPU", exact: true }),
    ).toHaveAttribute("value", "0");
    await cancel.click();
    const cancelled = page.getByText("Đã hủy oracle CPU; không công bố PASS.", { exact: true });
    await expect(cancelled).toBeVisible();
    await expect(cancel).toBeDisabled();
    await expect(
      page.getByRole("progressbar", { name: "Tiến độ oracle CPU", exact: true }),
    ).toHaveCount(0);
    // Resume queued animation callbacks under controlled time: cancellation must stay final.
    await page.clock.runFor(1000);
    await expect(cancelled).toBeVisible();
    await expect(
      page.getByText(
        "Oracle CPU PASS 12/12: CSR, contact IDs và penetration mẫu hiện tại. Không đo/kiểm GPU.",
        { exact: true },
      ),
    ).toHaveCount(0);
  } finally {
    await page.clock.resume();
  }
  await expect(
    page.getByText("JS heap và GPU timings chưa đo trong Canvas.", { exact: false }),
  ).toBeVisible();
});

test("Project 40 mounts all fourteen lessons and retains full source/download/progress", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const slugs = [
    "01-mat-vai-dau-tien",
    "02-du-doan-vi-tri",
    "03-mot-rang-buoc-xpbd",
    "04-topology-va-vai-cpu",
    "05-to-mau-rang-buoc-tren-gpu",
    "06-substep-lambda-va-damping",
    "07-va-cham-analytic",
    "08-grid-tiep-xuc-3d",
    "09-csr-count-scan-scatter",
    "10-tu-tiep-xuc-cua-vai",
    "11-normal-strain-va-debug",
    "12-ghim-keo-va-vong-doi",
    "13-kiem-chung-va-do-hieu-nang",
    "14-xuong-vai-hoan-chinh",
  ];
  for (const slug of slugs) {
    await page.goto("/projects/cloth-workshop/" + slug);
    await expect(page.getByLabel(canvasName, { exact: true })).toHaveAttribute(
      "data-render-state",
      "complete",
    );
  }
  await expect(page.locator(".checkpoint-source details.source-file").first()).toBeAttached();
  await expect(
    page.locator("a[href='/downloads/project-40-cloth-workshop.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Chạy vải", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.getByLabel(canvasName, { exact: true }).getAttribute("data-tick")),
    )
    .toBeGreaterThan(45);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await page
    .getByLabel(canvasName, { exact: true })
    .screenshot({ path: ".validation/p40-cloth-canvas.png", timeout: 5000 });
  expect(errors).toEqual([]);
});
