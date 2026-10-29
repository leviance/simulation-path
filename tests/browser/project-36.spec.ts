import { expect, test } from "@playwright/test";
const finalRoute = "/projects/ray-marched-shape-room/11-hoan-thien-can-phong-ray-march";

test("Project 36 stepper shows only taught controls and observes inside samples before confirming hit", async ({
  page,
}) => {
  await page.goto("/projects/ray-marched-shape-room/04-sphere-tracing-co-guard");
  await expect(
    page
      .getByRole("heading", { name: "Tiến dọc tia và biết vì sao phải dừng", exact: true })
      .first(),
  ).toBeVisible();
  const canvas = page.getByLabel("Canvas Project 36: camera ray, SDF và ray marching", {
    exact: true,
  });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await expect(page.getByRole("slider", { name: "Maximum steps", exact: true })).toHaveValue("128");
  await expect(page.getByRole("slider", { name: "Normal epsilon (m)", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Debug view", { exact: true })).toHaveCount(0);
  const readout = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.locator("dt").filter({ hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  await expect(readout("Mẫu đang xem")).toContainText("Chưa sample");
  await page.getByRole("button", { name: "Một mẫu", exact: true }).click();
  await expect(readout("Mẫu đang xem")).toContainText("1 · SDF 3.030000m");
  await expect(readout("Stop reason")).toContainText("Chưa đọc hết");
  await canvas.focus();
  await canvas.press("n");
  await expect(readout("Stop reason")).toHaveText("hit");
  await page.getByLabel("Preset", { exact: true }).selectOption("inside");
  await page.getByRole("button", { name: "Một mẫu", exact: true }).click();
  await expect(readout("Mẫu đang xem")).toContainText("1 · SDF -0.820000m");
  await expect(readout("Stop reason")).toContainText("Chưa đọc hết");
  await page.getByRole("button", { name: "Một mẫu", exact: true }).click();
  await expect(readout("Mẫu đang xem")).toContainText("traveled 0.820000m");
  await expect(readout("Stop reason")).toHaveText("hit");
  await page.getByRole("button", { name: "Đặt lại preset", exact: true }).click();
  await expect(page.getByLabel("Preset", { exact: true })).toHaveValue("inside");
  await expect(readout("Mẫu đang xem")).toContainText("Chưa sample");
});

test("Project 36 final separates camera, Pause, presets, view and reduced-motion behavior", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByLabel("Canvas Project 36: camera ray, SDF và ray marching", {
    exact: true,
  });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  const readout = (label: string) =>
    page
      .locator(".lab-readout > div")
      .filter({ has: page.locator("dt").filter({ hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  const camera = readout("Camera position / hướng tia chọn");
  const clock = readout("Clock đèn / Pause");
  const before = await camera.innerText();
  await canvas.focus();
  await canvas.press("w");
  await expect(camera).not.toHaveText(before);
  await expect(clock).toContainText("0.00s");
  await page.getByLabel("Preset", { exact: true }).selectOption("inside-camera");
  await expect(camera).toContainText("(-1.000, -0.180, 0.150)");
  await expect(readout("Tia được chọn: status / material / t")).toContainText(
    "hit · ID 1 · 0.820000m",
  );
  await page.getByRole("button", { name: "Tiến camera", exact: true }).click();
  await expect(camera).toContainText("(-0.700, -0.180, 0.150)");
  await expect(clock).toContainText("0.00s");
  await page.getByRole("button", { name: "Đặt lại preset", exact: true }).click();
  await expect(camera).toContainText("(-1.000, -0.180, 0.150)");
  await expect(page.getByLabel("Preset", { exact: true })).toHaveValue("inside-camera");
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  const image = () => canvas.evaluate((e) => (e as HTMLCanvasElement).toDataURL());
  const beauty = await image();
  await page.getByLabel("Debug view", { exact: true }).selectOption("1");
  await expect.poll(image).not.toBe(beauty);
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Chạy", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Đèn +0,1 giây", exact: true }).click();
  await expect(clock).toContainText("0.10s");
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(clock).toContainText("0.10s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Preset", { exact: true }).selectOption("default");
  for (const name of ["Sphere SDF", "Box SDF", "Torus SDF", "Room slabs"])
    await page.getByRole("checkbox", { name, exact: true }).uncheck();
  await expect(readout("Tia được chọn: status / material / t")).toContainText("emptyScene");
  await page.getByRole("button", { name: "Đặt lại preset", exact: true }).click();
  await page.getByRole("button", { name: "Chạy", exact: true }).click();
  await expect(clock).not.toContainText("0.00s");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  const stopped = await clock.innerText();
  await page.waitForTimeout(250);
  await expect(clock).toHaveText(stopped);
});

test("Project 36 pointer ownership, cancellation, DPR and final source work in the browser", async ({
  page,
}) => {
  await page.goto(finalRoute);
  const canvas = page.getByLabel("Canvas Project 36: camera ray, SDF và ray marching", {
    exact: true,
  });
  await expect(canvas).toHaveAttribute("data-render-state", "complete");
  const pointer = page
    .locator(".lab-readout > div")
    .filter({ has: page.locator("dt").filter({ hasText: "Ngân sách / pointer" }) })
    .locator("dd");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas has no bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(pointer).toContainText("đang capture");
  await canvas.dispatchEvent("pointerup", {
    pointerId: 999,
    isPrimary: false,
    button: 0,
    buttons: 0,
  });
  await expect(pointer).toContainText("đang capture");
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 8);
  await canvas.press("Escape");
  await expect(pointer).toContainText("đã nhả");
  await page.mouse.up();
  await canvas.evaluate((el) =>
    el.addEventListener(
      "pointerdown",
      (event) => {
        (el as HTMLCanvasElement).dataset.testOwner = String((event as PointerEvent).pointerId);
      },
      { once: true },
    ),
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const id = Number(await canvas.getAttribute("data-test-owner"));
  await canvas.dispatchEvent("pointercancel", {
    pointerId: id,
    isPrimary: true,
    button: 0,
    buttons: 0,
  });
  await expect(pointer).toContainText("đã nhả");
  expect(
    await canvas.evaluate((el, id) => (el as HTMLCanvasElement).hasPointerCapture(id), id),
  ).toBe(false);
  await page.mouse.up();
  await canvas.focus();
  await canvas.press("ArrowLeft");
  const bitmap = await canvas.evaluate((el) => ({
    width: (el as HTMLCanvasElement).width,
    css: el.getBoundingClientRect().width,
    dpr: devicePixelRatio,
  }));
  expect(Math.abs(bitmap.width / bitmap.css - bitmap.dpr)).toBeLessThan(0.02);
  await expect(
    page.getByRole("heading", { name: "Toàn bộ mã nguồn của dự án", exact: true }),
  ).toBeVisible();
  const file = page
    .locator(".checkpoint-source details.source-file")
    .filter({ has: page.locator("summary code").filter({ hasText: "include/tracing.hpp" }) })
    .first();
  await file.locator("summary").click();
  await expect(file.locator(".highlighted-code")).toContainText("std::abs(sample.distance)");
  await expect(
    page.locator("a[href='/downloads/project-36-ray-marched-shape-room.zip']").first(),
  ).toBeAttached();
});
