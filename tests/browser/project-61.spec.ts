import { expect, test } from "@playwright/test";
test("P61 keeps an interactive coverage mask for counting and uses actual footage for wind", async ({
  page,
}) => {
  await page.goto("/projects/voxel-greedy-meshing/01-gop-vat-dat");
  await page.getByLabel("Cảnh mẫu").selectOption("solid");
  const count = page
    .locator(".lab-readout div")
    .filter({ has: page.getByText("Quad đang so", { exact: true }) })
    .locator("dd");
  await expect(count).toHaveText("6");
  await page.getByRole("button", { name: "Gộp mặt đất" }).click();
  await expect(count).toHaveText("1536");
  await page.goto("/projects/voxel-greedy-meshing/04-kiem-mesh-va-gio");
  const gallery = page.locator("[data-native-media]");
  await expect(gallery.locator("video")).toHaveAttribute("poster", /grass\.png$/);
  await gallery.getByRole("button", { name: "Tán lá đón gió" }).click();
  await expect(gallery.locator("video")).toHaveAttribute("src", /wind\.webm$/);
  await expect(page.locator("canvas")).toHaveCount(0);
});
