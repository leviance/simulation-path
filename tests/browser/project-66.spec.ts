import { expect, test } from "@playwright/test";
const route = "/projects/widget-tree/08-kiem-chung-va-hoan-thien";
test("widget tree retains nodes across scene reset and removes the complete group", async ({
  page,
}) => {
  await page.goto(route);
  const read = (label: string) =>
    page
      .locator(".lab-readout div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("dd");
  await expect(read("Node / số lần dựng cây")).toHaveText("9 / 1");
  await page.getByRole("button", { name: "Một bước 1/120 s", exact: true }).click();
  await page.getByRole("button", { name: "Reset cảnh (giữ cây)", exact: true }).click();
  await expect(read("Node / số lần dựng cây")).toHaveText("9 / 1");
  await page.getByRole("button", { name: "Xóa nhóm control", exact: true }).click();
  await expect(read("Node / số lần dựng cây")).toHaveText("3 / 1");
  await expect(read("Hot / Active / Focus (ID)")).toHaveText("0 / 0 / 0");
  await page.getByRole("button", { name: "Thêm Label", exact: true }).click();
  await expect(read("Node / số lần dựng cây")).toHaveText("4 / 1");
  await page.getByRole("button", { name: "Kiểm cây hiện tại", exact: true }).click();
  await expect(read("Trạng thái")).toContainText("PASS: 4 node");
});
test("widget tree honors reduced motion and releases Tab at Canvas boundaries", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Chạy cảnh", exact: true })).toBeDisabled();
  const canvas = page.getByRole("application", { name: "Widget Tree Lab", exact: true });
  await canvas.focus();
  await canvas.press("Tab");
  await canvas.press("Tab");
  await canvas.press("Tab");
  await canvas.press("Tab");
  await expect(canvas).not.toBeFocused();
  await page.getByRole("button", { name: "Một bước 1/120 s", exact: true }).click();
  await expect(page.locator(".lab-readout")).toContainText("480 / 1 /");
});
