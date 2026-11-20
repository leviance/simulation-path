import { expect, test } from "@playwright/test";

test("TinyFlex: the interactive ruler shows basis, distribution and overflow independently", async ({
  page,
}) => {
  await page.goto("/projects/tiny-flex/03-chia-phan-du");
  const ruler = page.locator("[data-flex-ruler]");
  const result = ruler.locator("[aria-live]");
  await expect(result).toContainText("Nút A: 50 px; nút B: 90 px");
  await ruler.getByLabel("Grow của nút B").selectOption("0");
  await expect(result).toContainText("Nút A: 110 px; nút B: 30 px");
  await ruler.getByRole("button", { name: "Thử khung hẹp 50 px" }).click();
  await expect(result).toContainText("Tràn 10 px");
  await ruler.getByLabel("Chiều rộng (px)").press("ArrowRight");
  await expect(result).toContainText("Tràn 9 px");
  const graph = await ruler.locator("canvas").boundingBox();
  expect(graph).not.toBeNull();
  await page.mouse.move(graph!.x + 50, graph!.y + 62);
  await page.mouse.down();
  await page.mouse.move(graph!.x + graph!.width + 15, graph!.y + 62);
  await page.mouse.up();
  await expect(result).toContainText("Khung 220 px");
  await ruler.getByRole("button", { name: "Đặt lại ví dụ 1:2" }).click();
  await expect(result).toContainText("Nút A: 50 px; nút B: 90 px");
});
test("TinyFlex lets the reader compare the exact three native widths with the keyboard", async ({
  page,
}) => {
  await page.goto("/projects/tiny-flex/06-ba-kich-thuoc-cua-so");
  const media = page.locator("[data-native-media]");
  await expect(media.locator("img")).toHaveAttribute("src", /p70-wide\.png$/);
  const narrow = media.getByRole("button", { name: "Bảng hẹp 220" });
  await expect(narrow).toBeEnabled();
  await narrow.focus();
  await narrow.press("Space");
  await expect(media.locator("img")).toHaveAttribute("src", /p70-narrow\.png$/);
  await expect(media.locator("figcaption")).toContainText("clip");
  const reply = await page.request.get("/downloads/project-70-tiny-flex.zip");
  expect(reply.ok()).toBe(true);
  expect((await reply.body()).subarray(0, 2).toString()).toBe("PK");
});
