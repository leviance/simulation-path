import { expect, test } from "@playwright/test";

test("TinyHTML compares two actual layouts and links the three editable assets", async ({
  page,
}) => {
  await page.goto("/projects/tiny-html");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p68-desk\.png$/);
  const survey = gallery.getByRole("button", { name: "Bàn khảo sát hàng xóm" });
  await expect(survey).toBeEnabled();
  await survey.focus();
  await survey.press("Enter");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p68-survey\.png$/);
  await expect
    .poll(() => gallery.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(960);
  await page.goto("/projects/tiny-html/06-loi-va-khoi-phuc");
  await expect(page.locator("[data-native-media] img")).toHaveAttribute("src", /p68-bad\.png$/);
  await expect(
    page.locator("pre").filter({ hasText: "UNFINISHED FIELD NOTE" }).first(),
  ).toContainText("</label>");
  const zip = await page.request.get("/downloads/project-68-tiny-html.zip");
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
