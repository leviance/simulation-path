import { expect, test } from "@playwright/test";
test("the event lesson compares bubbling and stopping from native frames", async ({ page }) => {
  await page.goto("/projects/event-bindings/02-mot-click-di-qua-cay");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("img")).toHaveAttribute("src", /p71-bubble\.png$/);
  const stop = gallery.getByRole("button", { name: "Dừng ở nhóm Tools" });
  await expect(stop).toBeEnabled();
  await stop.click();
  await expect(gallery.locator("img")).toHaveAttribute("src", /p71-stopped\.png$/);
  await expect(gallery.locator("figcaption")).toContainText(/nhóm/i);
  const zip = await page.request.get("/downloads/project-71-event-bindings.zip");
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
});
