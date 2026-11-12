import { expect, test, type Locator, type Page } from "@playwright/test";
const overview = "/projects/mandelbulb-explorer";
const lessons = [
  "01-hinh-dau-tien-tu-phep-lap",
  "02-tu-mat-cat-den-ray-3d",
  "03-uoc-luong-khoang-cach",
  "04-normal-va-anh-sang",
  "05-camera-kham-pha",
  "06-doc-chi-phi-va-doi-chieu",
  "07-preview-va-anh-tinh-dan",
  "08-mau-sac-bong-va-khu-rang-cua",
  "09-hoan-thien-mandelbulb-explorer",
];
test.use({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
const row = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("..").locator("dd");
const generations = (page: Page) => row(page, "Yêu cầu / ACTIVE");
const configuration = (page: Page) => row(page, "Thông số ACTIVE (không phải input chưa áp dụng)");
async function open(page: Page, index = 8) {
  await page.goto(overview + "/" + lessons[index]);
  const canvas = page.getByLabel("Canvas Project 43: Mandelbulb và chi phí ray marching", {
    exact: true,
  });
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await expect(generations(page)).toHaveText(/\d+ \/ \d+/);
  return canvas;
}
async function signature(canvas: Locator) {
  return canvas.evaluate((element) => {
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 64;
    sample.getContext("2d")!.drawImage(element as HTMLCanvasElement, 0, 0, 96, 64);
    return sample.toDataURL();
  });
}
async function completed(page: Page, canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  await expect(generations(page)).toHaveText(/^(\d+) \/ \1$/);
  await expect(
    page.getByRole("progressbar", { name: "Tiến độ refinement Canvas" }),
  ).toHaveAttribute("value", "1", { timeout: 12000 });
}
test("Project 43 challenge, nine lessons, ZIP and isolated progress survive reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("p43-fixture")) return;
    localStorage.setItem("p43-fixture", "set");
    localStorage.setItem(
      "simulation-path-progress-v2",
      JSON.stringify({
        version: 2,
        completedLessonIds: ["p42-l01", "p43-l01"],
        projectContentVersions: { p42: 2 },
        lastLessonId: "p43-l01",
      }),
    );
  });
  await page.goto(overview);
  await expect(page.locator("#challenge-43")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Các bài của Dự án 43" }).getByRole("link"),
  ).toHaveCount(9);
  const zip = await page.request.get("/downloads/project-43-mandelbulb-explorer.zip");
  expect(zip.status()).toBe(200);
  expect([...(await zip.body()).subarray(0, 4)]).toEqual([80, 75, 3, 4]);
  await open(page, 0);
  const button = page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("simulation-path-progress-v2")!),
  );
  expect(progress.completedLessonIds).toEqual(["p42-l01", "p43-l01"]);
  expect(progress.projectContentVersions.p43).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("Canvas DPR, pointer capture, keyboard and reduced motion retain usable controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await open(page, 4);
  await expect(
    page.getByRole("button", { name: "Tiếp tục refinement", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => (el as HTMLCanvasElement).width / Math.round(el.getBoundingClientRect().width),
      ),
    )
    .toBe(2);
  const first = await signature(canvas);
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(generations(page)).toHaveText("2 / 2");
  await expect.poll(() => signature(canvas)).not.toBe(first);
  const box = (await canvas.boundingBox())!;
  let captured = false;
  await canvas.evaluate((el) => {
    el.addEventListener("gotpointercapture", () => el.setAttribute("data-tested-capture", "yes"), {
      once: true,
    });
  });
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x - 12, box.y + box.height * 0.5);
  await page.mouse.up();
  captured = (await canvas.getAttribute("data-tested-capture")) === "yes";
  expect(captured).toBe(true);
  await expect(generations(page)).toHaveText(/^(\d+) \/ \1$/);
  const held = await generations(page).innerText();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4);
  await expect(generations(page)).toHaveText(held);
  await canvas.focus();
  await canvas.press("+");
  await expect(generations(page)).not.toHaveText(held);
  await expect(page.getByText(/Reduced motion: refinement tự dừng/)).toBeVisible();
});
test("invalid/superseded/cancelled requests preserve the last-good labelled image", async ({
  page,
}) => {
  const canvas = await open(page, 6);
  await page.getByLabel(/Giữ job Canvas để đọc từng batch/).check();
  const retained = await generations(page).innerText();
  await page.getByLabel("Power", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Áp dụng tham số", exact: true }).click();
  await expect(generations(page)).toHaveText("2 / 1");
  await page.getByRole("button", { name: "Hủy ảnh đang tính", exact: true }).click();
  await expect(generations(page)).toHaveText("2 / 1");
  await expect(configuration(page)).toContainText("P8");
  await page.getByLabel("Power", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Áp dụng tham số", exact: true }).click();
  await expect(generations(page)).toHaveText("2 / 1");
  await expect(page.getByRole("status").filter({ hasText: /Canvas: power/ })).toBeVisible();
  await page.getByLabel("Power", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Áp dụng tham số", exact: true }).click();
  await page.getByRole("button", { name: "Tiến 1 batch", exact: true }).click();
  await expect(generations(page)).toHaveText("3 / 1");
  await page.getByLabel(/Giữ job Canvas để đọc từng batch/).uncheck();
  await canvas.scrollIntoViewIfNeeded();
  await expect(generations(page)).toHaveText("3 / 3");
  await expect(configuration(page)).toContainText("P10");
  expect(await generations(page).innerText()).not.toBe(retained);
  await page.getByRole("button", { name: "Reset preset", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(configuration(page)).toContainText("P8");
});
test("complete images expose changing heatmaps and true four-sample refinement", async ({
  page,
}) => {
  const canvas = await open(page, 7);
  await completed(page, canvas);
  const beauty = await signature(canvas);
  await page.getByLabel("Cách hiển thị", { exact: true }).selectOption("iterations");
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => signature(canvas)).not.toBe(beauty);
  await page.getByLabel("Mẫu mỗi pixel", { exact: true }).selectOption("4");
  await page.getByRole("button", { name: "Áp dụng tham số", exact: true }).click();
  await completed(page, canvas);
  await expect(row(page, "Mẫu final đã tính")).toHaveText(/20[.,]736 \/ 20[.,]736/);
  await expect(row(page, "Hit / miss / hết budget / inside / invalid")).toHaveText(/\/ 0$/);
  await page.getByLabel("Cách hiển thị", { exact: true }).selectOption("beauty");
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => signature(canvas)).not.toBe(beauty);
});
test("all nine modes render without page errors, blank graphics or layout overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (let index = 0; index < lessons.length; index++) {
    const canvas = await open(page, index);
    expect(
      await canvas.evaluate((el) => {
        const ctx = (el as HTMLCanvasElement).getContext("2d")!;
        const data = ctx.getImageData(
          0,
          0,
          (el as HTMLCanvasElement).width,
          (el as HTMLCanvasElement).height,
        ).data;
        let sum = 0;
        for (let p = 0; p < data.length; p += 400) sum += data[p] + data[p + 1] + data[p + 2];
        return sum;
      }),
    ).toBeGreaterThan(1000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
