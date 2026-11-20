import { expect, test } from "@playwright/test";
test("P64: compare actual sunlight at one pose by keyboard on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/voxel-sandbox/02-mot-mat-troi-chung");
  const gallery = page.locator("[data-native-media]");
  const afternoon = gallery.getByRole("button", { name: "Buổi chiều · 17 giờ" });
  await expect(gallery.locator("img")).toHaveAttribute("src", /sunrise\.png$/);
  await expect(afternoon).toBeEnabled();
  await afternoon.focus();
  await afternoon.press("Space");
  await expect(gallery.locator("img")).toHaveAttribute("src", /sunset\.png$/);
  await expect(afternoon).toHaveAttribute("aria-pressed", "true");
  const box = await gallery.locator("img").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
});
test("P64: if snow footage fails, the native first frame and descriptive caption remain", async ({
  page,
}) => {
  await page.route("**/flakes.webm", (route) => route.abort());
  await page.goto("/projects/voxel-sandbox/01-tuyet-roi-giua-rung-thong");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery).toHaveAttribute("data-ready", "true");
  await gallery.locator("video").evaluate((v: HTMLVideoElement) => {
    v.load();
    void v.play().catch(() => {});
  });
  await expect(gallery.getByRole("status")).toContainText("Không phát được video");
  await expect(gallery.locator("img")).toHaveAttribute("src", /flakes\.png$/);
  await expect(gallery.locator("img")).toHaveAttribute("alt", /tán thông/);
});
