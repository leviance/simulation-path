import { expect, test } from "@playwright/test";

test("TinyScript shows what two scripts do to the same gesture and ships their source", async ({
  page,
}) => {
  await page.goto("/projects/tiny-script/07-cung-thanh-keo-hai-hanh-vi");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p72-direct\.png$/);
  const near = gallery.getByRole("button", { name: "Khảo sát gần · 50 px" });
  await expect(near).toBeEnabled();
  await near.focus();
  await near.press("Enter");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p72-close\.png$/);
  await expect
    .poll(() => gallery.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(960);
  await expect(gallery.locator("figcaption")).toContainText("20 + (80 − 20) / 2");
  await expect(
    page.locator("pre").filter({ hasText: "function nearRadius" }).first(),
  ).toContainText("radius(nearRadius(value))");
  const zip = await page.request.get("/downloads/project-72-tiny-script.zip");
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
