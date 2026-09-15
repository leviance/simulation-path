import { expect, test } from "@playwright/test";

test("Project 38 exposes the particle budget and complete resident source", async ({ page }) => {
  await page.goto("/projects/five-million-particle-fountain/03-capability-budget-va-ssbo-160-mb");
  await expect(page.getByRole("heading", { name: "Tính ngân sách cho SSBO 160 MB" })).toBeVisible();
  await expect(page.getByLabel("Particle count")).toBeVisible();
  await expect(page.getByText("160.000.000", { exact: false })).toBeVisible();

  await page.goto("/projects/five-million-particle-fountain/10-hoan-thien-dai-phun-5-trieu-hat");
  await expect(
    page.getByRole("heading", { name: "Hoàn thiện đài phun 5 triệu hạt" }),
  ).toBeVisible();
  await expect(page.getByText("Các điều kiện cần đạt")).toBeVisible();
  await expect(page.getByText("Mã hoàn chỉnh", { exact: false })).toBeVisible();
});
