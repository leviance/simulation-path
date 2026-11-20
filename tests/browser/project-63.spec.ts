import { expect, test } from "@playwright/test";
test("P63 plays the real sea and stops it when the reader chooses a different recording", async ({
  page,
}) => {
  await page.goto("/projects/voxel-procedural-terrain/05-di-tu-tuyet-ra-bien");
  const gallery = page.locator("[data-native-media]");
  const video = gallery.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("src", /sea\.webm$/);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused && !v.autoplay)).toBe(true);
  await video.evaluate((v: HTMLVideoElement) => v.play());
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1);
  await gallery.getByRole("button", { name: "Nước trong thung lũng" }).click();
  await expect(video).toHaveAttribute("src", /river\.webm$/);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await gallery.getByRole("button", { name: "Chỗ nghỉ trong rừng" }).click();
  await expect(video).toHaveCount(0);
  await expect(gallery.locator("img")).toHaveAttribute("src", /clearing\.png$/);
});
