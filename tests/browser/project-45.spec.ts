import { expect, test, type Locator, type Page } from "@playwright/test";
import project from "../../course/projects/p45/manifest";

const overview = "/projects/atomic-playground";
const modes = [
  "field",
  "measure",
  "cdf",
  "gpu",
  "batches",
  "splats",
  "clip",
  "probe",
  "compare",
  "config",
  "validation",
];
const progressKey = "simulation-path-progress-v2";
// The inner `has` locator is relative to each row, not to the surrounding lab.
const row = (scope: Locator, label: string) =>
  scope
    .locator(".lab-readout > div")
    .filter({ has: scope.page().getByText(label, { exact: true }) })
    .locator("dd");
test.use({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1.5,
  contextOptions: { reducedMotion: "reduce" },
});

async function open(page: Page, index: number) {
  await page.goto(`${overview}/${project.lessons[index].slug}`);
  await expect(page.locator(".lesson-hero h1")).toHaveText(project.lessons[index].title);
  const lab = page.locator(`[data-atomic-mode="${modes[index]}"]`),
    canvas = lab.locator("canvas");
  await expect(lab).toHaveAttribute("data-ready", "true");
  await canvas.scrollIntoViewIfNeeded();
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Active / trong khung chiếu")).toHaveText(/^8\.192 \/ [1-9]/);
  return { lab, canvas };
}
async function signature(canvas: Locator) {
  return canvas.evaluate(async (element) => {
    // A newly accepted model is rendered on the following animation frame.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const canvas = element as HTMLCanvasElement,
      ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let index = 0; index < data.length; index += 64)
      hash = Math.imul(hash ^ (data[index] + data[index + 1] * 3 + data[index + 2] * 7), 16777619);
    return hash >>> 0;
  });
}

test("Atomic edition redirects old URLs, migrates only retired progress and preserves dark navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((key) => {
    localStorage.setItem("simulation-path-theme", "dark");
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          completedLessonIds: ["p44-l12", "p45-l01", "p45-l10", "p46-l01"],
          projectContentVersions: { p44: 2 },
        }),
      );
  }, progressKey);
  await page.goto("/projects/molecular-lab-gpu");
  await expect(page).toHaveURL(new RegExp(overview + "$"));
  await expect(page.locator("#challenge-45")).toBeVisible();
  await expect(page.locator(".lesson-list > a")).toHaveCount(11);
  await expect(page.getByLabel("Nội dung thuộc bản cũ", { exact: true })).toHaveCount(0);
  await expect(
    page.locator('a[href="/downloads/project-45-atomic-playground.zip"]').first(),
  ).toBeVisible();
  await page.locator(".lesson-list > a").first().click();
  await expect(page).toHaveURL(new RegExp(project.lessons[0].slug + "$"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const complete = page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
  await expect(complete).toHaveAttribute("aria-pressed", "false");
  await complete.click();
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(state.completedLessonIds).toEqual(["p44-l12", "p46-l01", "p45-l01"]);
  expect(state.projectContentVersions.p45).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

for (const start of [0, 4, 8])
  test(`Atomic routes ${start + 1}–${Math.min(start + 4, 11)} mount actual Canvas at DPR1.5`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (let index = start; index < Math.min(start + 4, 11); ++index) {
      const { lab, canvas } = await open(page, index);
      expect(
        await canvas.evaluate(
          (element) =>
            (element as HTMLCanvasElement).width /
            Math.round(element.getBoundingClientRect().width),
        ),
      ).toBeCloseTo(1.5, 2);
      const active = await row(lab, "Cloud A đang vẽ").innerText();
      await canvas.focus();
      await canvas.press("ArrowRight");
      await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
      await expect(lab).toContainText("không phải GPU triệu mẫu");
      if (index === 10) await canvas.screenshot({ path: ".validation/p45-browser-validation.png" });
    }
    expect(errors).toEqual([]);
  });

test("Atomic CDF trace follows actual IDs and changing table resolution publishes a new approximation", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 2);
  const trace = lab.locator('[data-atomic-trace="true"]');
  await expect(trace).toBeVisible();
  const first = await row(trace, "u₀ chọn bin r / u₁ jitter r").innerText();
  await trace.getByLabel("Sample ID A", { exact: true }).fill("257");
  await expect(row(trace, "u₀ chọn bin r / u₁ jitter r")).not.toHaveText(first);
  await expect(row(trace, "XYZ trong Float32 record đang vẽ")).toHaveText(/-?\d/);
  await expect(trace).toContainText("đúng phép tính mà sampler dùng khi sinh cloud");
  const active = await row(lab, "Cloud A đang vẽ").innerText();
  await lab.getByRole("button", { name: "Pause sinh mẫu", exact: true }).click();
  await lab.getByRole("combobox", { name: "Số bin r", exact: true }).selectOption("64");
  await lab.getByRole("combobox", { name: "Số bin μ", exact: true }).selectOption("32");
  await lab.getByRole("combobox", { name: "Số bin φ", exact: true }).selectOption("64");
  await expect(row(lab, "Trạng thái")).toContainText("PAUSE · generating");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await expect(row(lab, "Table CPU")).toContainText("2048 radial × 64 μ × 128 φ");
  await lab.getByRole("button", { name: "Tiếp tục sinh", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Table CPU")).toContainText("64 radial × 32 μ × 64 φ");
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(active);
  await expect(trace.getByLabel("Sample ID A", { exact: true })).toHaveValue("257");
});

test("Atomic Pause/step/cancel/retry retains the correctly labelled last-good cloud", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 4);
  const active = await row(lab, "Cloud A đang vẽ").innerText();
  await lab.getByRole("button", { name: "Pause sinh mẫu", exact: true }).click();
  await lab.getByRole("combobox", { name: "Orbital A", exact: true }).selectOption("fxyz");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await expect(row(lab, "Cấu hình muốn nhận")).toContainText("4f_xyz");
  await lab.getByRole("button", { name: "Chạy một batch", exact: true }).click();
  await expect(row(lab, "Requested / generated / accepted")).toContainText("/ 512 / 0");
  await lab.getByRole("button", { name: "Hủy candidate · C", exact: true }).click();
  await expect(row(lab, "Trạng thái")).toContainText("cancelled");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await lab.getByRole("button", { name: "Reset cùng seed · R", exact: true }).click();
  await lab.getByRole("button", { name: "Tiếp tục sinh", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Cloud A đang vẽ")).toContainText("4f_xyz · seed 45");
});

test("Atomic clipping/brightness/camera retain probability denominators and secondary-only jobs keep controls", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 10);
  const active = await row(lab, "Cloud A đang vẽ").innerText();
  const region = await row(lab, "Vùng đo / N toàn cloud").innerText();
  const histogram = await lab.locator("tbody").innerText();
  await lab.getByLabel("Mặt cắt · P", { exact: true }).check();
  await lab.getByRole("slider", { name: /Opacity/ }).focus();
  await lab.getByRole("slider", { name: /Opacity/ }).press("End");
  await canvas.focus();
  await canvas.press("ArrowRight");
  await canvas.press("+");
  await canvas.press("w");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await expect(row(lab, "Vùng đo / N toàn cloud")).toHaveText(region);
  await expect(lab.locator("tbody")).toHaveText(histogram, { useInnerText: true });
  await lab.getByLabel("So hai cloud cùng thang a₀", { exact: true }).check();
  await expect(row(lab, "Cloud B / scale")).toContainText("current");
  await lab.getByRole("button", { name: "Pause sinh mẫu", exact: true }).click();
  await lab.getByRole("combobox", { name: "Orbital B", exact: true }).selectOption("dz2");
  await expect(lab.getByRole("button", { name: "Chạy một batch", exact: true })).toBeEnabled();
  await lab.getByRole("button", { name: "Chạy một batch", exact: true }).click();
  await expect(row(lab, "B requested / generated / trong khung")).toContainText("8192 / 512 /");
  await lab.getByRole("button", { name: "Hủy candidate · C", exact: true }).click();
  await expect(row(lab, "Cloud B / scale")).toContainText("last-good/chờ");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
});

test("Atomic N/seed form and wrong samplers change real records while reference stays fixed", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 10);
  const initial = await row(lab, "Cloud A đang vẽ").innerText();
  await lab.getByLabel("N CPU", { exact: true }).fill("4099");
  await lab.getByLabel("Seed uint32", { exact: true }).fill("4294967295");
  await lab.getByRole("button", { name: "Sinh cloud từ N/seed", exact: true }).click();
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(initial);
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Cloud A đang vẽ")).toContainText("2p_z · seed 4294967295");
  await expect(row(lab, "Requested / generated / accepted")).toContainText("4.099 / 4.099 / 4.099");
  await expect(row(lab, "Active / trong khung chiếu")).toHaveText(/^4\.099 \/ [1-9]/);
  const weighted = await row(lab, "Cloud A đang vẽ").innerText(),
    histogram = await lab.locator("tbody").innerText(),
    reference = await lab.locator("tbody tr td:last-child").allTextContents(),
    weightedRegion = await row(lab, "Vùng đo / N toàn cloud").innerText();
  await lab.getByRole("combobox", { name: "Sampler", exact: true }).selectOption("uniformRadius");
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(weighted);
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(lab.locator("tbody")).not.toHaveText(histogram, { useInnerText: true });
  expect(await lab.locator("tbody tr td:last-child").allTextContents()).toEqual(reference);
  // This deliberately wrong mode samples r uniformly on [0,32], not by 2p density.
  const inside = Number.parseInt(await row(lab, "Vùng đo / N toàn cloud").innerText(), 10);
  expect(inside / 4099).toBeGreaterThan(0.075);
  expect(inside / 4099).toBeLessThan(0.175);
  const wrongRadius = await row(lab, "Cloud A đang vẽ").innerText();
  await lab.getByRole("combobox", { name: "Sampler", exact: true }).selectOption("uniformAngle");
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(wrongRadius);
  await expect(row(lab, "Trạng thái")).toContainText("current");
  // Wrong theta leaves the radial draw and its centered-sphere measurement intact.
  await expect(lab.locator("tbody")).toHaveText(histogram, { useInnerText: true });
  await expect(row(lab, "Vùng đo / N toàn cloud")).toHaveText(weightedRegion);
  const wrongAngleImage = await signature(canvas),
    wrongAngle = await row(lab, "Cloud A đang vẽ").innerText();
  await lab.getByRole("combobox", { name: "Sampler", exact: true }).selectOption("weighted");
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(wrongAngle);
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect.poll(() => signature(canvas)).not.toBe(wrongAngleImage);
  await expect(lab.locator("tbody")).toHaveText(histogram, { useInnerText: true });
});

test("Atomic moving the probe updates membership and quadrature without resampling the cloud", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 7);
  const active = await row(lab, "Cloud A đang vẽ").innerText(),
    histogram = await lab.locator("tbody").innerText(),
    region = await row(lab, "Vùng đo / N toàn cloud").innerText(),
    reference = await row(lab, "Reference vùng / chênh quadrature").innerText(),
    initialImage = await signature(canvas);
  const centerX = lab.getByRole("slider", { name: /^Tâm X/ });
  await centerX.focus();
  await centerX.press("End");
  await expect(centerX).toHaveValue("20");
  await expect(row(lab, "Vùng đo / N toàn cloud")).not.toHaveText(region);
  await expect(row(lab, "Reference vùng / chênh quadrature")).not.toHaveText(reference);
  await expect.poll(() => signature(canvas)).not.toBe(initialImage);
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await expect(lab.locator("tbody")).toHaveText(histogram, { useInnerText: true });
  const movedRegion = await row(lab, "Vùng đo / N toàn cloud").innerText();
  expect(Number.parseInt(movedRegion, 10)).toBeLessThan(Number.parseInt(region, 10));
  const radius = lab.getByRole("slider", { name: /^Bán kính vùng/ });
  await radius.focus();
  await radius.press("End");
  await expect(radius).toHaveValue("30");
  await expect(row(lab, "Vùng đo / N toàn cloud")).not.toHaveText(movedRegion);
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await expect(lab.locator("tbody")).toHaveText(histogram, { useInnerText: true });
});

test("Atomic pointer pan, focused wheel and keyboard cancel/reset preserve deterministic last-good", async ({
  page,
}) => {
  const { lab, canvas } = await open(page, 4);
  const active = await row(lab, "Cloud A đang vẽ").innerText(),
    initialImage = await signature(canvas),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect.poll(() => signature(canvas)).not.toBe(initialImage);
  const pannedImage = await signature(canvas);
  await canvas.focus();
  await page.mouse.wheel(0, -180);
  await expect.poll(() => signature(canvas)).not.toBe(pannedImage);
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await canvas.press("Space");
  await expect(row(lab, "Trạng thái")).toContainText("PAUSE");
  await lab.getByRole("combobox", { name: "Orbital A", exact: true }).selectOption("fxyz");
  await expect(row(lab, "Trạng thái")).toContainText("PAUSE · generating");
  await canvas.press("c");
  await expect(row(lab, "Trạng thái")).toContainText("cancelled");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await canvas.press("r");
  await expect(row(lab, "Trạng thái")).toContainText("PAUSE · generating");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await canvas.press("Space");
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Cloud A đang vẽ")).toContainText("4f_xyz · seed 45");
  const accepted = await row(lab, "Cloud A đang vẽ").innerText(),
    acceptedImage = await signature(canvas);
  await canvas.press("r");
  await expect(row(lab, "Cloud A đang vẽ")).not.toHaveText(accepted);
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect.poll(() => signature(canvas)).toBe(acceptedImage);
});

test("Atomic JSON validation preserves last-good and a valid configuration restores seed and dimensions", async ({
  page,
}) => {
  const { lab } = await open(page, 9);
  await lab.getByText("JSON cấu hình nhỏ: preset/N/seed/sampler", { exact: true }).click();
  await lab.getByRole("button", { name: "Xuất cấu hình JSON", exact: true }).click();
  const input = lab.getByLabel("JSON tối đa 2 KiB, không chứa point cloud", { exact: true });
  const saved = await input.inputValue(),
    config = JSON.parse(saved);
  expect(config).toMatchObject({
    schema: 1,
    orbital: "pz",
    seed: 45,
    radialBins: 2048,
    muBins: 64,
    phiBins: 128,
  });
  const active = await row(lab, "Cloud A đang vẽ").innerText();
  await input.fill(JSON.stringify({ ...config, seed: -1 }));
  await lab.getByRole("button", { name: "Nạp cấu hình JSON", exact: true }).click();
  await expect(lab.getByRole("status")).toContainText("Cấu hình không hợp lệ");
  await expect(row(lab, "Cloud A đang vẽ")).toHaveText(active);
  await lab.getByRole("combobox", { name: "Orbital A", exact: true }).selectOption("s2");
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await input.fill(saved);
  await lab.getByRole("button", { name: "Nạp cấu hình JSON", exact: true }).click();
  await expect(row(lab, "Trạng thái")).toContainText("current");
  await expect(row(lab, "Cloud A đang vẽ")).toContainText("2p_z · seed 45");
});

test("Atomic pointer capture releases on blur/resize and navigation disposes finite pending work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { lab, canvas } = await open(page, 10);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  await expect(lab).toContainText("Reduced motion đang bật");
  const initial = await signature(canvas),
    box = (await canvas.boundingBox())!;
  await canvas.evaluate((element) => {
    element.addEventListener("gotpointercapture", () =>
      element.setAttribute("data-capture-started", "yes"),
    );
    element.addEventListener("lostpointercapture", () =>
      element.setAttribute("data-capture-released", "yes"),
    );
  });
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await expect(canvas).toHaveAttribute("data-capture-started", "yes");
  await expect.poll(() => signature(canvas)).not.toBe(initial);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-capture-released", "yes");
  await expect(lab.getByRole("button", { name: "Tiếp tục sinh", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const stopped = await signature(canvas);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await expect.poll(() => signature(canvas)).toBe(stopped);
  await canvas.evaluate((element) => element.removeAttribute("data-capture-released"));
  await page.mouse.down();
  await page.setViewportSize({ width: 1300, height: 800 });
  await expect(canvas).toHaveAttribute("data-capture-released", "yes");
  await page.mouse.up();
  await lab.getByRole("combobox", { name: "Orbital A", exact: true }).selectOption("px");
  await expect(row(lab, "Trạng thái")).toContainText("PAUSE · generating");
  await page
    .getByRole("link", { name: /Getting Started|Bắt đầu/ })
    .first()
    .click();
  await expect(page).not.toHaveURL(new RegExp(project.lessons[10].slug + "$"));
  expect(errors).toEqual([]);
});

test("Atomic final exposes complete source, copy and ZIP links without download tracking or file chooser", async ({
  page,
  context,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/project-sources/")) requested.push(request.url());
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${overview}/${project.lessons[10].slug}`);
  await expect(page.locator("#ma-hoan-chinh-cua-project")).toHaveText("Toàn bộ mã nguồn của dự án");
  await expect(
    page.locator('a[href="/downloads/project-45-atomic-playground.zip"]').first(),
  ).toBeVisible();
  const cmake = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^CMakeLists\.txt$/ }) });
  await expect(cmake).toHaveAttribute("data-ready", "true");
  await cmake.locator("summary").click();
  await expect(cmake.locator("pre code")).toContainText("cmake_minimum_required(VERSION 3.24)");
  const copy = cmake.getByRole("button", { name: "Sao chép đoạn code", exact: true });
  await copy.click();
  await expect(copy).toHaveText("ĐÃ CHÉP");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("SDL3::SDL3");
  const main = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code", { hasText: /^src\/main\.cpp$/ }) });
  await expect(main).toHaveAttribute("data-ready", "true");
  await main.locator("summary").click();
  await expect(main.locator("pre code")).toContainText("atom::Application app");
  expect(requested.length).toBeGreaterThanOrEqual(2);
  expect(requested.every((url) => new URL(url).pathname.startsWith("/project-sources/45/"))).toBe(
    true,
  );
});
