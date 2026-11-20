import { expect, test } from "@playwright/test";

test("TinyCSS compares the native themes without changing the shared markup", async ({ page }) => {
  await page.goto("/projects/tiny-css");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p69-lagoon\.png$/);
  const field = gallery.getByRole("button", { name: "Ngoài hiện trường" });
  await expect(field).toBeEnabled();
  await field.click();
  await expect(gallery.locator("img")).toHaveAttribute("src", /p69-field\.png$/);
  await expect
    .poll(() => gallery.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(960);
  await page.goto("/projects/tiny-css/04-doi-mau-hay-xep-lai");
  await expect(page.locator("pre").filter({ hasText: "#F5CD80" }).first()).toContainText(".sheet");
  const zip = await page.request.get("/downloads/project-69-tiny-css.zip");
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
