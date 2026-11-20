import { expect, test } from "@playwright/test";

const examples = [
  ["voxel-hidden-faces/02-mep-hai-chunk", "field-scene", "region.load({0, 1});"],
  ["voxel-ray-editor/03-doc-khong-sua", "field-controls", "scene.holdHit = !scene.holdHit;"],
  ["voxel-greedy-meshing/04-kiem-mesh-va-gio", "field-scene", "region.lastBuildMs"],
  [
    "voxel-chunk-streaming/02-chia-ngan-sach",
    "field-controls",
    "scene.stream.budget = 3 - scene.stream.budget;",
  ],
  ["voxel-procedural-terrain/05-di-tu-tuyet-ra-bien", "field-controls", "scene.resetPose();"],
  ["voxel-sandbox/01-tuyet-roi-giua-rung-thong", "field-scene", "depthDot(drawing, f.point"],
] as const;

for (const [route, name, line] of examples) {
  test(`Work instructions open at the actual integration point: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/projects/" + route);
    const step = page.locator("details.source-file").filter({
      has: page.locator("summary", { hasText: "work/include/trail/" + name + ".hpp" }),
    });
    const control = step.locator("summary").first();
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(step.locator(".highlighted-code").filter({ hasText: line }).first()).toBeVisible();
    await expect(step.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".checkpoint-diff details[open]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
