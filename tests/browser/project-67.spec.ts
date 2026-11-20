import { expect, test } from "@playwright/test";

test("P67 compares actual native layouts before/after reflow and shows the clipped slider", async ({
  page,
}) => {
  await page.goto("/projects/box-layout/06-an-them-xoa-control");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p67-group\.png$/);
  const hide = gallery.getByRole("button", { name: "Sau khi ẩn Reset" });
  await expect(hide).toBeEnabled();
  await hide.focus();
  await hide.press("Enter");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p67-hidden\.png$/);
  await expect(gallery.locator("figcaption")).toContainText("52 pixel");
  await page.goto("/projects/box-layout/08-overflow-va-clipping");
  await expect(page.locator("[data-native-media] img")).toHaveAttribute(
    "src",
    /p67-overflow\.png$/,
  );
  const zip = await page.request.get("/downloads/project-67-box-layout.zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
