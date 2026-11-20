import { expect, test } from "@playwright/test";

test("P66 shows the actual retained desk and its inspector; course links keep their sources", async ({
  page,
}) => {
  await page.goto("/projects/widget-tree");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p66-desk\.png$/);
  const inspect = gallery.getByRole("button", { name: "Bật inspector" });
  await expect(inspect).toBeEnabled();
  await inspect.focus();
  await inspect.press("Enter");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p66-inspect\.png$/);
  await expect(gallery.locator("img")).toHaveAttribute("alt", /bounds local, bounds world/);
  await page.goto("/projects/widget-tree/03-cat-theo-khung-cha");
  await expect(page.locator("[data-native-media] img")).toHaveAttribute("src", /p66-clip\.png$/);
  const zip = await page.request.get("/downloads/project-66-widget-tree.zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
