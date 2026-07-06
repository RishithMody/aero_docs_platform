import path from "path";
import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8081";
const FIXTURE = path.join(__dirname, "..", "fixtures", "hydraulic-pump-manual.txt");

test.describe("UI E2E", () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL}/health`);
    test.skip(!health.ok(), "API not running — start docker compose first");
  });

  test("homepage loads with title and ollama panel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-title")).toHaveText("AeroDocs Knowledge Base");
    await expect(page.getByTestId("ollama-panel")).toBeVisible();
  });

  test("all search tabs are visible", async ({ page }) => {
    await page.goto("/");
    for (const tab of ["semantic", "part", "barcode", "image", "ask", "upload"]) {
      await expect(page.getByTestId(`tab-${tab}`)).toBeVisible();
    }
  });

  test("upload document end-to-end", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-upload").click();
    await page.getByTestId("upload-title").fill("Manual Test Upload");
    await page.getByTestId("upload-comments").fill("Playwright E2E");
    await page.getByTestId("file-input").setInputFiles(FIXTURE);
    await page.getByTestId("submit-button").click();

    await expect(page.getByTestId("status-message")).toContainText("Uploaded", {
      timeout: 120_000,
    });
  });

  test("semantic search returns results after upload", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-upload").click();
    await page.getByTestId("upload-title").fill("Search Seed Doc");
    await page.getByTestId("file-input").setInputFiles(FIXTURE);
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("status-message")).toContainText("Uploaded", {
      timeout: 120_000,
    });

    await page.getByTestId("tab-semantic").click();
    await page.getByTestId("query-input").fill("hydraulic pump seal replacement");
    await page.getByTestId("submit-button").click();

    await expect(page.getByTestId("search-results")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("result-card").first()).toBeVisible();
  });

  test("part number search tab", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-part").click();
    await expect(page.getByTestId("query-input")).toHaveAttribute(
      "placeholder",
      /part number/i,
    );
    await page.getByTestId("query-input").fill("HYD-4521");
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("search-results")).toBeVisible({ timeout: 30_000 });
  });
});
