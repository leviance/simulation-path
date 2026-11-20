import { expect, test } from "@playwright/test";

test("same seed and tick: the two native radius examples are distinct, selectable by keyboard", async ({
  page,
}) => {
  await page.goto("/projects/simulator-controls/04-ban-kinh-va-luc-tach");
  const gallery = page.locator("[data-native-media]");
  const picture = gallery.locator("img");
  await expect(picture).toHaveAttribute("src", /p65-near\.png$/);
  const wide = gallery.getByRole("button", { name: "Bán kính 140 px" });
  await expect(wide).toBeEnabled();
  await wide.focus();
  await wide.press("Enter");
  await expect(wide).toHaveAttribute("aria-pressed", "true");
  await expect(picture).toHaveAttribute("src", /p65-wide\.png$/);
  await expect(gallery.getByRole("link")).toHaveAttribute("href", /p65-wide\.png$/);
  await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(960);
  await expect(gallery.locator("canvas")).toHaveCount(0);
});
test("P65 preserves the old lesson URL, provides the new source ZIP and shows the real final", async ({
  page,
}) => {
  await page.goto("/projects/simulator-controls/04-slider-trong-luc");
  await expect(page).toHaveURL(/04-ban-kinh-va-luc-tach$/);
  await page.goto("/projects/simulator-controls");
  await expect(page.locator("[data-native-media] img")).toHaveAttribute("src", /p65-final\.png$/);
  const zip = await page.request.get("/downloads/project-65-simulator-controls.zip");
  expect(zip.ok()).toBeTruthy();
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
