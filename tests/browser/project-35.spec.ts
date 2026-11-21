import { expect, test, type Page } from "@playwright/test";

const project = "/projects/shader-hot-reload-lab";
const last = project + "/07-kiem-chung-nang-qua-cua-chop";

async function waitForCanvas(page: Page) {
  const canvas = page.getByTestId("shutter-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      canvas.evaluate(
        (el) => (el as HTMLCanvasElement).getContext("2d")?.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  return canvas;
}

test("P35 old bookmark leads to a working shutter lesson; project has native evidence and downloadable source", async ({
  page,
  request,
}) => {
  await page.goto(project + "/10-hoan-thien-shader-gallery");
  await expect(page).toHaveURL(new RegExp(last + "$"));
  await expect(
    page.getByRole("heading", { name: "Kiểm chứng nắng qua cửa chớp", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Toàn bộ mã nguồn của dự án", exact: true }),
  ).toBeAttached();
  const zip = page.locator("a[href='/downloads/project-35-shader-hot-reload-lab.zip']").first();
  await expect(zip).toBeAttached();
  expect((await request.head((await zip.getAttribute("href"))!)).ok()).toBeTruthy();
  await page.goto(project);
  await expect(page.getByRole("heading", { name: /Nắng qua cửa chớp/i }).first()).toBeVisible();
  const lessons = page.locator("#lessons a[href]");
  const urls = await lessons.evaluateAll((items) => items.map((a) => a.getAttribute("href")!));
  expect(urls).toHaveLength(7);
  for (const url of urls) {
    expect((await request.get(url)).status(), url).toBe(200);
  }
  const img = page.locator('img[src*="shutter-light"]').first();
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1120);
});

test("P35 actual interactive Canvas follows the slat, gap and crate, and distinguishes low-resolution sampling", async ({
  page,
}) => {
  await page.goto(last);
  const canvas = await waitForCanvas(page);
  const pixelImage = () => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await page.getByTestId("shutter-spot-slat").click();
  await expect(page.getByTestId("shutter-hit")).toHaveAttribute("data-kind", "blade");
  const dark = await pixelImage();
  await page.getByTestId("shutter-spot-gap").click();
  await expect(page.getByTestId("shutter-visibility")).toHaveAttribute("data-lit", "true");
  await expect.poll(pixelImage).not.toBe(dark);
  await page.getByTestId("shutter-layer").selectOption("compare");
  await page.getByTestId("shutter-samples").selectOption("32");
  await expect(page.getByTestId("shutter-map-lit")).toHaveAttribute("data-lit", "false");
  await page.getByTestId("shutter-samples").selectOption("512");
  await expect(page.getByTestId("shutter-map-lit")).toHaveAttribute("data-lit", "true");
  await page.getByTestId("shutter-spot-crate").click();
  await expect(page.getByTestId("shutter-hit")).toHaveAttribute("data-kind", "crate");
  await page.getByTestId("shutter-box").press("Home");
  await expect(page.getByTestId("shutter-hit")).toHaveAttribute("data-kind", "none");
});

test("P35 supports capture cancellation, keyboard and reduced motion, and does not show future controls in lesson one", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(project + "/01-dung-goc-phong-tu-mot-mesh");
  await waitForCanvas(page);
  await expect(page.getByTestId("shutter-lab")).toHaveAttribute("data-stage", "1");
  await expect(page.getByTestId("shutter-layer")).toHaveCount(0);
  await page.goto(last);
  const canvas = await waitForCanvas(page);
  const board = page.getByTestId("shutter-lab");
  await expect(page.getByTestId("shutter-play")).toBeDisabled();
  await page.getByTestId("shutter-spot-gap").click();
  await canvas.scrollIntoViewIfNeeded();
  const before = await page.getByTestId("shutter-point").innerText();
  const rect = await canvas.boundingBox();
  expect(rect).toBeTruthy();
  await page.mouse.move(rect!.x + rect!.width * 0.42, rect!.y + rect!.height * 0.6);
  await page.mouse.down();
  await expect(board).toHaveAttribute("data-captured", "true");
  await page.keyboard.press("Escape");
  await expect(board).toHaveAttribute("data-captured", "false");
  await page.mouse.up();
  await expect(page.getByTestId("shutter-point")).toHaveText(before);
  await page.getByTestId("shutter-step").click();
  await expect(board).toHaveAttribute("data-paused", "true");
  await page.getByTestId("shutter-reset").click();
  await expect(page.getByTestId("shutter-tilt")).toHaveValue("23");
});
