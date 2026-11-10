import { expect, test, type Locator, type Page } from "@playwright/test";

const overview = "/projects/geometry-workshop";
const canvasName = "Canvas Project 41: xưởng hình học 3D";
const progressKey = "simulation-path-progress-v2";

test.use({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 2 });

function readout(page: Page, name: string) {
  return page
    .locator(".lab-readout > div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator("dd");
}

function signature(canvas: Locator) {
  return canvas.evaluate((element) => {
    const sample = document.createElement("canvas");
    sample.width = 32;
    sample.height = 24;
    const context = sample.getContext("2d")!;
    context.drawImage(element as HTMLCanvasElement, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 0;
    for (const value of pixels) hash = (Math.imul(hash, 31) + value) | 0;
    return hash;
  });
}

async function openLab(page: Page, lesson: string) {
  await page.goto(overview + "/" + lesson);
  const canvas = page.getByLabel(canvasName, { exact: true });
  await expect(canvas).toBeVisible();
  await expect.poll(() => signature(canvas)).not.toBe(0);
  return canvas;
}

test("Project 41 opens its new lessons and migrates only the retired progress", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 2,
        completedLessonIds: ["p40-l14", "p41-l01", "p41-l07"],
        projectContentVersions: { p40: 2 },
      }),
    );
  }, progressKey);
  await page.goto("/roadmap");
  const entry = page.locator("#project-41");
  await expect(entry).toHaveAttribute("href", overview);
  await expect(entry).toContainText("9 bài");
  await entry.click();
  await expect(page).toHaveURL(/\/projects\/geometry-workshop$/);
  await expect(page.getByLabel("Chờ nghiệm thu", { exact: true })).toBeVisible();
  const lessons = page.getByRole("navigation", { name: "Các bài của Dự án 41" });
  await expect(lessons.getByRole("link")).toHaveCount(9);
  await lessons.getByRole("link").first().click();
  const button = page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(stored.completedLessonIds).toEqual(["p40-l14", "p41-l01"]);
  expect(stored.projectContentVersions.p41).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Project 41 patch changes its normal and respects reduced motion and DPR", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await openLab(page, "01-manh-mat-co-anh-sang");
  const initial = await signature(canvas);
  const normal = await readout(page, "Normal").innerText();
  await page.getByRole("slider", { name: "Chiều cao mảnh mặt" }).press("End");
  await expect(readout(page, "Normal")).not.toHaveText(normal);
  await expect.poll(() => signature(canvas)).not.toBe(initial);
  await expect(page.getByRole("button", { name: "Tự xoay", exact: true })).toBeDisabled();
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const c = element as HTMLCanvasElement;
        return c.width / Math.round(c.getBoundingClientRect().width);
      }),
    )
    .toBe(2);
});

test("Project 41 demonstrates reversed seams, correction and one-based OBJ indices", async ({
  page,
}) => {
  await openLab(page, "04-dao-mep-mobius");
  await expect(readout(page, "Normal đầu · cuối")).toHaveText("-1");
  await expect(readout(page, "Khoảng cách ở mép")).toHaveText("0");

  await openLab(page, "06-khep-frame-torus-knot");
  const correction = page.getByRole("checkbox", { name: "Bù góc ở đường nối" });
  await correction.uncheck();
  await expect(readout(page, "Khoảng cách ở mép")).not.toHaveText("0");
  await correction.check();
  await expect(readout(page, "Khoảng cách ở mép")).toHaveText("0");

  await openLab(page, "08-xuat-obj-va-doc-lai");
  await expect(readout(page, "Đọc lại")).toHaveText("Khớp ba ID của mesh");
  await page.getByRole("checkbox", { name: "Thử bỏ +1" }).check();
  await expect(readout(page, "Đọc lại")).toHaveText("Chỉ số không hợp lệ");
});

test("Project 41 advances bounded batches and cancels without replacing the last-good mesh", async ({
  page,
}) => {
  await openLab(page, "07-preview-va-mesh-gan-nhat");
  await page.getByRole("button", { name: "Giữ preview khi chỉnh" }).click();
  await page.getByRole("slider", { name: "Số ô theo u" }).press("End");
  await expect(readout(page, "Đang vẽ")).toContainText("preview");
  await expect(readout(page, "Yêu cầu đang chờ")).toContainText("0/97 hàng · chờ buông");
  await page.getByRole("button", { name: "Tạm dừng làm mịn" }).click();
  await page.getByRole("button", { name: "Buông để dựng" }).click();
  await page.getByRole("button", { name: "Tiến một batch" }).click();
  await expect(readout(page, "Yêu cầu đang chờ")).toContainText("8/97 hàng");
  await page.getByRole("button", { name: "Hủy bản đang dựng" }).click();
  await expect(readout(page, "Lưới đang vẽ")).toHaveText("80 × 24 ô");
  await expect(readout(page, "Yêu cầu đang chờ")).toHaveText("Không có yêu cầu");
});

test("Project 41 releases a camera drag outside the canvas without rebuilding", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await openLab(page, "09-hoan-thien-xuong-hinh-hoc");
  await canvas.scrollIntoViewIfNeeded();
  const before = await signature(canvas);
  await canvas.press("ArrowRight");
  await expect.poll(() => signature(canvas)).not.toBe(before);
  const rotated = await signature(canvas);
  const box = await canvas.boundingBox();
  if (!box) throw Error("The geometry canvas is not visible");
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height + 14, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => signature(canvas)).not.toBe(rotated);
  const released = await signature(canvas);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await canvas.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await signature(canvas)).toBe(released);
  await expect(readout(page, "Số lần dựng / nhận")).toHaveText("1 / 1");
  await page.setViewportSize({ width: 980, height: 840 });
  await expect(canvas).toBeVisible();
  expect(errors).toEqual([]);
});
