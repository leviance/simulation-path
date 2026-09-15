import { expect, test } from "@playwright/test";

test("Project 39 exposes the hierarchy lab and complete workbench source", async ({ page }) => {
  await page.goto("/projects/gpu-reduction-prefix-sum/01-hai-dau-ra-hai-hop-dong");
  await expect(page.getByLabel("Input 0")).toHaveValue("3");
  await page.getByLabel("Input 0").fill("9");
  await expect(page.getByLabel("Input 0")).toHaveValue("9");
  await page.getByLabel("Operation").selectOption("inclusive-scan");
  await expect(page.getByLabel("Operation")).toHaveValue("inclusive-scan");

  await page.goto("/projects/gpu-reduction-prefix-sum/02-ve-cay-pass-va-phan-duoi");
  await expect(
    page.getByRole("heading", { name: "Vẽ trước cây pass và xử lý phần đuôi" }),
  ).toBeVisible();
  await expect(page.getByLabel("Element count")).toBeVisible();
  await expect(page.getByText("445 zero padding", { exact: false })).toBeVisible();
  await page.getByLabel("Block span").selectOption("256");
  await expect(page.getByText("189 zero padding", { exact: false })).toBeVisible();

  await page.goto("/projects/gpu-reduction-prefix-sum/03-reduction-trong-mot-workgroup");
  await page.getByLabel("Workgroup barrier").selectOption("missing");
  await expect(page.getByText("stale read", { exact: false })).toBeVisible();

  await page.goto("/projects/gpu-reduction-prefix-sum/10-hoan-thien-reduction-scan-workbench");
  await expect(
    page.getByRole("heading", { name: "Hoàn thiện Reduction & Scan Workbench" }),
  ).toBeVisible();
  await expect(page.getByText("Kết quả kiểm tra")).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
