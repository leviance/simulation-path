import { expect, test, type Locator, type Page } from "@playwright/test";

// Compare computed styles across real routes (including lazy CSS modules); a matching class
// name alone doesn't catch a late-loading module or a lesson's .prose rules winning the cascade.
async function surface(control: Locator) {
  return control.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      background: css.backgroundColor,
      color: css.color,
      border: css.borderTopColor,
      radius: css.borderTopLeftRadius,
      font: css.fontFamily,
      size: css.fontSize,
      weight: css.fontWeight,
      line: css.lineHeight,
      height: css.minHeight,
    };
  });
}

function contrast(a: string, b: string) {
  const luminance = (rgb: string) => {
    const channels = rgb
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map((v) => {
        const n = Number(v) / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

async function open(page: Page, slug: string) {
  await page.goto("/projects/" + slug, { waitUntil: "domcontentloaded" });
}

const ordinaryButton = 'button:enabled:not([aria-pressed="true"])';
const samples = [
  ["memory-layout-race", '[aria-label="Bàn quan sát đài phun"]'],
  ["particle-morph-studio", "[data-particle-morph-mode]"],
  ["mandelbulb-explorer", "[data-mandelbulb-mode]"],
  ["atomic-playground/01-doc-field-orbital", "[data-atomic-mode]"],
  ["sph-water-gpu", "[data-water51-ready]"],
  ["volume-slicer/01-mo-cua-so-va-ve-lat-dau", "[data-volume53-ready]"],
  ["volume-ray-marching/01-cua-so-va-fullscreen-triangle", "[data-v54-ready]"],
  ["tiny-flex/03-chia-phan-du", "[data-native-media]"],
] as const;

for (const theme of ["light", "dark"]) {
  test("lab controls and headers use the same course style in " + theme, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((t) => localStorage.setItem("simulation-path-theme", t), theme);
    await open(page, "hello-pixels");
    const standard = page.locator(".interactive-lab");
    const reference = await surface(standard.locator(ordinaryButton).first());
    const select = await surface(standard.locator("select").first());
    const slider = await standard
      .locator('input[type="range"]')
      .first()
      .evaluate((el) => getComputedStyle(el).accentColor);
    const heading = await surface(standard.locator(".lab-heading h2"));
    const panel = await surface(standard);
    expect(parseFloat(reference.size)).toBeGreaterThanOrEqual(14);
    expect(contrast(reference.color, reference.background)).toBeGreaterThanOrEqual(4.5);

    for (const [slug, selector] of samples) {
      await open(page, slug);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const sample = page.locator(selector).first();
      expect(await surface(sample.locator(ordinaryButton).first()), slug).toEqual(reference);
      if (await sample.locator("select").count()) {
        expect(await surface(sample.locator("select").first()), slug).toEqual(select);
      }
      for (const accent of await sample
        .locator('input[type="range"]')
        .evaluateAll((items) => items.map((el) => getComputedStyle(el).accentColor))) {
        expect(accent, slug).toBe(slider);
      }
      const enclosing = page.locator("[data-lab-ui]").filter({ has: sample }).first();
      const shell = selector === "[data-native-media]" ? sample : enclosing;
      expect(await surface(shell.locator(".lab-heading h2")), slug).toEqual(heading);
      expect(await surface(shell), slug).toEqual(panel);
      await expect(page.locator("[data-lab-ui] .interactive-lab")).toHaveCount(0);
    }
  });
}

test("native gallery keeps its keyboard selection and both panels fit a narrow lesson", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "shader-hot-reload-lab/07-kiem-chung-nang-qua-cua-chop");
  const gallery = page.locator("[data-native-media]");
  const buttons = gallery.getByRole("group", { name: "Chọn cảnh" }).getByRole("button");
  const next = buttons.nth(1);
  await expect(next).toBeEnabled();
  const poster = await gallery.locator("img").getAttribute("src");
  const inactive = await surface(next);
  await page.keyboard.press("Tab");
  await next.focus();
  await expect(next).toHaveCSS("outline-style", "solid");
  await next.press("Enter");
  await expect(next).toHaveAttribute("aria-pressed", "true");
  await expect(buttons.first()).toHaveAttribute("aria-pressed", "false");
  await expect(gallery.locator("img")).not.toHaveAttribute("src", poster!);
  const active = await surface(next);
  expect(active.background).not.toBe(inactive.background);
  expect(contrast(active.color, active.background)).toBeGreaterThanOrEqual(4.5);
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /Chuyển sang giao diện/ }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    theme === "dark" ? "light" : "dark",
  );
  await expect(next).toHaveAttribute("aria-pressed", "true");
  expect(await surface(next)).toEqual(active);
  const canvas = page.getByTestId("shutter-lab");
  await expect(canvas).toBeAttached();
  const play = page.getByTestId("shutter-play");
  await expect(play).toBeDisabled();
  await expect(play).toHaveCSS("cursor", "not-allowed");
  await expect(page.locator("[data-lab-ui]")).toHaveCount(2);
  for (const section of await page.locator("[data-lab-ui]").all()) {
    expect(await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
});
