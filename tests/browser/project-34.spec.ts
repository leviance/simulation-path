import { expect, test } from "@playwright/test";

const finalRoute = "/projects/dual-renderer-cube/09-hoan-thien-dual-renderer-cube";
test("Project 34 opens a real-mesh viewer and exposes complete source/download", async ({
  page,
}) => {
  await page.goto("/projects/dual-renderer-cube/01-khoa-mot-cube-scene-dung-chung");
  await expect(
    page
      .locator(".lesson-hero")
      .getByRole("heading", { name: "Mở lại model viewer, tách scene khỏi renderer" }),
  ).toBeVisible();
  await expect(page.locator("canvas[aria-label^='Model viewer OBJ']")).toBeVisible();
  await page.goto(finalRoute);
  await expect(
    page
      .locator(".lesson-hero")
      .getByRole("heading", { name: "Đối chiếu, đo thời gian và hoàn thiện viewer" }),
  ).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Tải ZIP Dự án/ }).first()).toHaveAttribute(
    "href",
    "/downloads/project-34-dual-renderer-cube.zip",
  );
});

test("P34 Canvas keeps pose across backend switches, orbit, pan, zoom, reset and reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(finalRoute);
  const canvas = page.locator("canvas[aria-label^='Model viewer OBJ']");
  await canvas.scrollIntoViewIfNeeded();
  await page.getByRole("combobox", { name: "Model", exact: true }).selectOption("1");
  await expect(page.getByText("faceted-sphere ·", { exact: false })).toBeVisible();
  const pose = page.getByText("Tư thế chung", { exact: true }).locator("..").locator("dd");
  const original = await pose.innerText();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(pose).not.toHaveText(original);
  const rotated = await pose.innerText();
  for (let i = 0; i < 24; i++) {
    await canvas.press(i % 2 ? "F1" : "F2");
  }
  await expect(pose).toHaveText(rotated);
  await page.getByRole("combobox", { name: "Kéo chuột trái" }).selectOption("camera");
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(pose).not.toHaveText(rotated);
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  await page.getByRole("button", { name: "Pan trái", exact: true }).click();
  await page.getByRole("checkbox", { name: "Normals", exact: true }).check();
  await page.getByRole("checkbox", { name: "Wireframe", exact: true }).check();
  await page.getByRole("checkbox", { name: /Xem depth/ }).check();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(pose).toHaveText(original);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
  await expect(pose).not.toHaveText(original);
  await canvas.press("Escape");
  await page.mouse.up();
  await expect(pose).toHaveText(original);
  await expect.poll(() => canvas.evaluate((e) => e.hasPointerCapture(1))).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Tiếp tục", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiến 10°", exact: true }).click();
  await expect(pose).not.toHaveText(original);
  await canvas.focus();
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.setViewportSize({ width: 1100, height: 850 });
  await expect
    .poll(() => canvas.evaluate((e) => (e as HTMLCanvasElement).width))
    .toBeGreaterThan(300);
  expect(errors).toEqual([]);
});
