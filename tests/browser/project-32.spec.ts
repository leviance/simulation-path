import { expect, test } from "@playwright/test";

const finalRoute = "/projects/memory-layout-race/08-hoan-thien-memory-layout-race";
const canvasName = /Đài phun hạt CPU — Canvas minh họa/;

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
