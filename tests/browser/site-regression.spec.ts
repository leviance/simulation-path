import { expect, test } from "@playwright/test";

test("static One Dark code keeps scrolling, indentation and copy without inflating the lesson", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as typeof window & { copiedCode: string }).copiedCode = value;
        },
      },
    });
  });
  const response = await page.goto(
    "/projects/double-pendulum-chaos/03-tich-phan-rk4-va-theo-doi-energy",
  );
  expect(response?.status()).toBe(200);
  expect((await response!.body()).byteLength).toBeLessThan(300 * 1024);
  const pre = page.locator("figure[data-rehype-pretty-code-figure] [data-code-html] pre").first();
  const code = pre.locator("code");
  await expect(code).toContainText("inline DoublePendulumState addDerivative");
  const source = await code.textContent();
  expect(source).toContain("\n    DoublePendulumState next = state;");
  await pre.getByRole("button", { name: "Sao chép đoạn code" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as typeof window & { copiedCode: string }).copiedCode))
    .toBe(source);
  const style = await pre.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      background: css.backgroundColor,
      whitespace: css.whiteSpace,
      overflow: css.overflowX,
      tabSize: css.tabSize,
      marginTop: css.marginTop,
    };
  });
  expect(style).toEqual({
    background: "rgb(40, 44, 52)",
    whitespace: "pre",
    overflow: "auto",
    tabSize: "4",
    marginTop: "0px",
  });
  const diff = page.locator(".checkpoint-diff details").first();
  await expect(diff.locator(".highlighted-code")).toHaveCount(0);
  await diff.locator("summary").click();
  await expect(diff.locator(".highlighted-code")).toContainText("@@");
  await expect(page.locator(".katex math").first()).toBeAttached();
});

test("clean texture mode retains text and lazy collision controls preserve stepping and reset", async ({
  page,
}) => {
  await page.goto("/projects/perspective-checkerboard");
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate(
          (element) =>
            (element as HTMLCanvasElement).getContext("2d")?.getImageData(0, 0, 1, 1).data[3],
        ),
    )
    .toBe(255);
  await expect(page.locator(".lab-readout")).toBeVisible();
  await expect(page.locator(".lab-readout")).toContainText("Khoảng cách camera");
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("Affine UV");
  await page.getByRole("button", { name: "Chế độ trình diễn", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("Trạng thái");

  await page.goto("/projects/collision-tank/11-hoan-thien-spawn-debug-va-nghiem-thu");
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate(
          (element) =>
            (element as HTMLCanvasElement).getContext("2d")?.getImageData(0, 0, 1, 1).data[3],
        ),
    )
    .toBe(255);
  const readout = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.locator("dt").filter({ hasText: new RegExp("^" + label + "$") }) })
      .locator("dd");
  await page.getByLabel("Số bóng", { exact: true }).selectOption("64");
  await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
  await expect(readout("Bước physics đã chạy")).toHaveText("1");
  await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("tạm dừng");
  await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(readout("Bước physics đã chạy")).toHaveText("0");
});

test("Project 15 and 18 final source panels load their own published JSON", async ({ page }) => {
  for (const route of [
    "/projects/3d-pipeline-inspector/07-ghep-mvp-va-validation",
    "/projects/near-plane-clipper/08-canh-3d-va-ban-hoan-chinh",
  ]) {
    await page.goto(route);
    const file = page
      .locator(".checkpoint-source details.source-file")
      .filter({ has: page.locator("summary code").filter({ hasText: /^src\/main\.cpp$/ }) })
      .first();
    await file.locator("summary").click();
    await expect(file.locator(".highlighted-code")).toContainText("int main");
    await expect(file.locator("[role='alert']")).toHaveCount(0);
  }
});

test("lazy spring and double-pendulum panels preserve single-step, reset and debug controls", async ({
  page,
}) => {
  for (const route of ["/projects/spring-chain", "/projects/double-pendulum-chaos"]) {
    await page.goto(route);
    await expect
      .poll(() =>
        page
          .locator("canvas")
          .evaluate(
            (element) =>
              (element as HTMLCanvasElement).getContext("2d")?.getImageData(0, 0, 1, 1).data[3],
          ),
      )
      .toBe(255);
    const elapsed = page
      .locator(".lab-readout div")
      .filter({ has: page.locator("dt").filter({ hasText: /^Elapsed \/ bước physics$/ }) })
      .locator("dd");
    await expect(elapsed).toContainText("0.000 s / 0");
    await page.getByRole("button", { name: "Tiến một bước", exact: true }).click();
    await expect(elapsed).toContainText("/ 1");
    await page.getByRole("button", { name: "Ẩn debug", exact: true }).click();
    await expect(page.getByRole("button", { name: "Hiện debug", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hiện debug", exact: true }).click();
    await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
    await expect(elapsed).toContainText("0.000 s / 0");
  }
});
