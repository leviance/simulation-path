import { expect, test } from "@playwright/test";

test("Learner can open actual C++ and GLSL edits in the optical workbooks", async ({ page }) => {
  for (const entry of [
    ["ray-intersections/01-canh-3d", "include/scene-drawing.hpp", "cpp", "drawScene"],
    ["xray-detector/09-do-anh-tren-gpu", "shaders/attenuation.frag", "glsl", "uSpectral"],
  ]) {
    const [route, file, language, addition] = entry;
    await page.goto("/projects/" + route);
    const edits = page
      .locator("details.voxel-work-file")
      .filter({ has: page.locator("summary code", { hasText: "work/" + file }) });
    await edits.locator(":scope > summary").click();
    const newCode = edits.locator('section > .highlighted-code[data-language="' + language + '"]');
    await expect(newCode.filter({ hasText: addition }).first()).toBeVisible();
    await expect(edits.getByRole("alert")).toHaveCount(0);
    await edits.locator(":scope > summary").click();
    await expect(edits).not.toHaveAttribute("open");
  }
});
