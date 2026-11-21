import { expect, test } from "@playwright/test";

const finalRoute = "/projects/memory-layout-race/08-hoan-thien-memory-layout-race";
const canvasName = /Đài phun hạt CPU — Canvas minh họa/;

test("P32 overview shows three native photographs of one jet and serves its downloadable course", async ({
  page,
}) => {
  await page.goto("/projects/memory-layout-race");
  const gallery = page.locator("[data-native-media]").first();
  const image = gallery.locator("figure img");
  await gallery.scrollIntoViewIfNeeded();
  for (const [name, photo] of [
    ["Theo đường nước từ miệng vòi đến khi rơi", "single.png"],
    ["Nhìn ngang để thấy nơi giọt đổi chiều", "profile.png"],
    ["Nhìn từ trên để thấy độ xòe", "plan.png"],
  ]) {
    await gallery.getByRole("button", { name, exact: true }).click();
    await expect(image).toHaveAttribute("src", "/field-notes/cpu-fountain/" + photo);
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]))
      .toEqual([1120, 820]);
  }
  const download = page.locator('a[href$="project-32-memory-layout-race.zip"]').first();
  const href = await download.getAttribute("href");
  if (!href) throw new Error("Overview has no source ZIP");
  expect((await page.request.head(href)).ok()).toBeTruthy();
  const lessons = [
    ...new Set(
      await page
        .locator('a[href^="/projects/memory-layout-race/"]')
        .evaluateAll((anchors) =>
          anchors
            .map((a) => a.getAttribute("href"))
            .filter((v): v is string => !!v && /\/\d{2}-/.test(v)),
        ),
    ),
  ];
  expect(lessons).toHaveLength(8);
  for (const lesson of lessons) expect((await page.request.get(lesson)).ok()).toBeTruthy();
});

test("P32 spread, three views and an expiring drop all refer to the same live state", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const observation = page.getByRole("region", { name: "Bàn quan sát đài phun" });
  const canvas = page.getByRole("img", { name: canvasName });
  const spread = observation.getByRole("slider", { name: "Độ xòe" });
  await expect(spread).toHaveValue("2");
  await observation.getByRole("button", { name: "Theo một giọt" }).click();
  await observation.getByRole("button", { name: "Tìm giọt sắp tái sinh" }).click();
  const inspector = observation.getByRole("group", { name: "Giọt đang theo dõi" });
  const id = await inspector.getByLabel("Slot cần xem").inputValue();
  await expect(inspector).toContainText("ID " + id + " · generation 0");
  const age = inspector
    .locator("div")
    .filter({ has: page.getByText("Tuổi / lifetime", { exact: true }) })
    .last()
    .locator("dd");
  const ageBefore = await age.innerText();
  const image = () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  const oblique = await image();
  await observation.getByRole("button", { name: "Nhìn từ trên" }).click();
  await expect.poll(image).not.toBe(oblique);
  const plan = await image();
  await canvas.press("F3");
  await expect(observation.getByRole("button", { name: "Nhìn ngang" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(image).not.toBe(plan);
  await expect(age).toHaveText(ageBefore);
  const lateral = inspector
    .locator("div")
    .filter({ has: page.getByText("Vận tốc ngang X / Z", { exact: true }) })
    .last()
    .locator("dd");
  const velocities = await lateral.innerText();
  await spread.press("Home");
  await expect(spread).toHaveValue("0");
  await expect(lateral).toHaveText(velocities);
  await expect(age).toHaveText(ageBefore);
  await canvas.press("n");
  await expect(inspector).toContainText("ID " + id + " · generation 1");
  await expect(age).not.toHaveText(ageBefore);
  await expect(lateral).toContainText(" / 0.000 m/s");
  await canvas.press("r");
  await expect(inspector).toContainText("ID " + id + " · generation 0");
  await expect(age).toHaveText(ageBefore);
  await expect(lateral).toContainText(" / 0.000 m/s");
  await canvas.press(".");
  await expect(spread).toHaveValue("0.5");
});

test("P32 performs a full live step and preserves state through a layout round trip", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByRole("img", { name: canvasName });
  await expect(canvas).toBeVisible();
  const telemetry = page
    .locator("dl")
    .filter({ has: page.getByText("Allocated / alive / updated", { exact: true }) });
  await expect(telemetry).toContainText("20.000 / 20.000 / 0");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(telemetry).toContainText("20.000 / 20.000 / 20.000");
  const state = page.getByText(/Đã cập nhật đủ 20000 hạt sống/);
  await expect(state).toBeVisible();
  await page.getByRole("button", { name: "Đổi sang SoA", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đổi sang AoS", exact: true })).toBeVisible();
  await expect(page.getByText(/Đã đổi layout, giữ nguyên ID/)).toBeVisible();
  await page.getByRole("button", { name: "Đổi sang AoS", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đổi sang SoA", exact: true })).toBeVisible();
  await expect(telemetry).toContainText("1 bước");
});

test("P32 pointer ownership releases capture and Escape restores the camera gesture", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByRole("img", { name: canvasName });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.up();
  expect(
    await canvas.evaluate((element) =>
      Array.from({ length: 10 }, (_, id) => element.hasPointerCapture(id)).some(Boolean),
    ),
  ).toBe(false);
  await canvas.screenshot(); // Let the completed drag paint before testing rollback.
  const beforeGesture = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()))
    .not.toBe(beforeGesture);
  await canvas.press("Escape");
  await page.mouse.up();
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()))
    .toBe(beforeGesture);
  expect(
    await canvas.evaluate((element) =>
      Array.from({ length: 10 }, (_, id) => element.hasPointerCapture(id)).some(Boolean),
    ),
  ).toBe(false);
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
});

test("P32 worker validates two workloads, reports completed rows and never invents a speed winner", async ({
  page,
}) => {
  test.setTimeout(45000); // Includes the independent 35-second worker watchdog and UI setup.
  await page.goto(finalRoute);
  await page.getByLabel("Preset / số hạt Canvas").selectOption("3");
  const workerStarted = page.waitForEvent("worker");
  await page.getByRole("button", { name: "Đo 3 N × 2 workload", exact: true }).click();
  const runtime = await workerStarted;
  expect(new URL(runtime.url()).origin).toBe(new URL(page.url()).origin);
  expect(new URL(runtime.url()).protocol).toMatch(/^https?:$/);
  const results = page.getByRole("region", { name: "Kết quả benchmark đài phun" });
  await expect(results).toContainText("Đã đo đủ", { timeout: 35000 });
  await expect(results.locator("tbody tr")).toHaveCount(6);
  await expect(results).toContainText("gravity-only");
  await expect(results).toContainText("full-lifecycle");
  await expect(results).toContainText("≤ 1 đạt");
  await expect(results).toContainText("không loại bỏ kết quả đó");
});

test("P32 can cancel a real paused worker before any completed row", async ({ page }) => {
  // Pause at the message boundary so this test does not race a fast 256-particle run.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown) {
        super.postMessage(message);
        if (
          typeof message === "object" &&
          message !== null &&
          "kind" in message &&
          message.kind === "start" &&
          "requestId" in message
        ) {
          super.postMessage({ kind: "pause", requestId: message.requestId, paused: true });
        }
      }
    };
  });
  await page.goto(finalRoute);
  await page.getByRole("button", { name: "Đo AoS và SoA", exact: true }).click();
  const results = page.getByRole("region", { name: "Kết quả benchmark đài phun" });
  await expect(results).toContainText("đang tạm dừng");
  await page.getByRole("button", { name: "Hủy tác vụ", exact: true }).click();
  await expect(results).toContainText(/hủy/i);
  await expect(page.getByRole("button", { name: "Đo AoS và SoA", exact: true })).toBeEnabled();
});

test("P32 opening lesson exposes only its supplied state/camera milestone", async ({ page }) => {
  await page.goto("/projects/memory-layout-race/01-khoa-workload-mot-trieu-particles");
  await expect(page.getByRole("img", { name: canvasName })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiến một bước", exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Đổi sang SoA|Đo AoS|Đo baseline|Đo 3 N/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Workload chỉ dùng khi đo")).toHaveCount(0);
});

test("P32 reduced motion allows a single step without enabling continuous motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(finalRoute);
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(page.getByText(/Đã cập nhật đủ 20000 hạt sống/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
});

test("P32 lazy source stays on the right checkpoint during previous/next navigation", async ({
  page,
}) => {
  const previousRoute = "/projects/memory-layout-race/07-benchmark-va-scaling-release";
  const application = () =>
    page
      .locator(".checkpoint-source details.source-file")
      .filter({ has: page.locator("summary code").filter({ hasText: "include/application.hpp" }) })
      .first();
  await page.goto(finalRoute);
  await application().locator("summary").click();
  await expect(application().locator(".highlighted-code")).toContainText("reset(1'000'000)");
  await page.locator(`a[href="${previousRoute}"]`).last().click();
  await expect(page).toHaveURL(new RegExp(previousRoute + "$"));
  await application().locator("summary").click();
  await expect(application().locator(".highlighted-code")).toContainText("reset(10'000)");
  await expect(application().locator(".highlighted-code")).not.toContainText("reset(1'000'000)");
  await page.locator(`a[href="${finalRoute}"]`).last().click();
  await application().locator("summary").focus();
  await application().locator("summary").press("Enter");
  await expect(application().locator(".highlighted-code")).toContainText("reset(1'000'000)");
});
