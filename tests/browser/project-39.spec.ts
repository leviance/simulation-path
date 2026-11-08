import { expect, test } from "@playwright/test";

test("Project 39 pointer capture, DPR and reduced-motion controls work in the browser", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/million-object-city/12-thanh-pho-hoan-chinh");
  const canvas = page.getByLabel("Canvas Project 39: thành phố 3D, mẫu CPU nhỏ", { exact: true });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(page.getByRole("button", { name: "Bay tiến tự động", exact: true })).toBeDisabled();
  await canvas.scrollIntoViewIfNeeded();
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
  if (!box) throw Error("Missing city canvas bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const captured = () =>
    canvas.evaluate((element) => element.hasPointerCapture(Number(element.dataset.testPointer)));
  await expect.poll(captured).toBe(true);
  await canvas.dispatchEvent("pointercancel", { pointerId: 999 });
  await expect.poll(captured).toBe(true);
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 25);
  await page.mouse.up();
  await expect.poll(captured).toBe(false);
  const dimensions = await canvas.evaluate((element) => ({
    bitmap: (element as HTMLCanvasElement).width,
    css: element.getBoundingClientRect().width,
    dpr: Math.min(3, devicePixelRatio),
  }));
  expect(Math.abs(dimensions.bitmap / dimensions.css - dimensions.dpr)).toBeLessThan(0.03);
  await canvas.focus();
  await canvas.press("w");
  await canvas.press("ArrowLeft");
});

test("Project 39 mounts every city lesson and preserves the final source/progress interface", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const lessons = [
    "01-khu-pho-dau-tien",
    "02-mot-trieu-object-tu-seed",
    "03-sau-mat-phang-vung-nhin",
    "04-mask-tren-gpu",
    "05-reduction-count-min-max",
    "06-exclusive-scan-trong-block",
    "07-scan-nhieu-tang",
    "08-compact-visible-ids",
    "09-lenh-ve-indirect",
    "10-debug-va-chon-vat-the",
    "11-kiem-chung-va-do-hieu-nang",
    "12-thanh-pho-hoan-chinh",
  ];
  for (const lesson of lessons) {
    await page.goto("/projects/million-object-city/" + lesson);
    await expect(
      page.getByLabel("Canvas Project 39: thành phố 3D, mẫu CPU nhỏ", { exact: true }),
    ).toHaveAttribute("data-render-state", "complete");
  }
  const source = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code").filter({ hasText: "include/city_compute.hpp" }) })
    .first();
  await source.locator("summary").click();
  await expect(source.locator(".highlighted-code")).toContainText("GL_COMMAND_BARRIER_BIT");
  await expect(
    page.locator("a[href='/downloads/project-39-million-object-city.zip']").first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đã hoàn thành", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByLabel("Canvas Project 39: thành phố 3D, mẫu CPU nhỏ", { exact: true })
    .screenshot({ path: ".validation/p39-canvas-final.png", timeout: 5000 });
  expect(errors).toEqual([]);
});

test("Project 39 city Canvas offers a real fly camera, culling, seed and deterministic reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/million-object-city/01-khu-pho-dau-tien");
  const canvas = page.getByLabel("Canvas Project 39: thành phố 3D, mẫu CPU nhỏ");
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await page.getByRole("button", { name: "Tầm đường phố", exact: true }).click();
  await canvas.focus();
  await page.keyboard.press("w");
  await page.getByRole("button", { name: "Culling ON", exact: true }).click();
  await expect(page.getByRole("button", { name: "Culling OFF", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByLabel("Seed thành phố").fill("44");
  await expect(page.getByLabel("Seed thành phố")).toHaveValue("44");
  await page.getByLabel("Record CPU mẫu").selectOption("257");
  await expect(page.getByText("Đã tạo 257 record CPU từ seed 44.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByText("Đã khôi phục đúng seed, số record và camera ban đầu.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Frustum debug", exact: true }).click();
  await expect(page.getByRole("button", { name: "Frustum debug", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("Project 39 scan and indirect lessons expose CPU fixture and finite cancellable comparison", async ({
  page,
}) => {
  await page.goto("/projects/million-object-city/07-scan-nhieu-tang");
  await expect(
    page.getByLabel("Canvas Project 39: thành phố 3D, mẫu CPU nhỏ", { exact: true }),
  ).toHaveAttribute("data-render-state", "complete");
  await expect(
    page.getByRole("group", { name: "Điều khiển thành phố 3D", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("columnheader", { name: "Mask [M0,M1,M2,total]", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Prefix [M0,M1,M2,total]", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đối chiếu CPU 9 góc nhìn", exact: true }).click();
  await expect(
    page.getByText("Đối chiếu CPU 9/9: không mất/trùng ID. Không đo thời gian GPU.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/projects/million-object-city/09-lenh-ve-indirect");
  await expect(
    page.getByRole("columnheader", { name: "instanceCount", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "visibleOffset", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Canvas mô hình hóa các phép tính bằng TypeScript", { exact: false }),
  ).toBeVisible();
});
