import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8081";

test.describe("API E2E", () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL}/health`);
    test.skip(!health.ok(), "API not running — start docker compose first");
  });

  test("health returns ollama status", async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ollama.reachable).toBe(true);
  });

  test("upload fixture and semantic search", async ({ request }) => {
    const upload = await request.post(`${API_URL}/documents/upload`, {
      multipart: {
        file: {
          name: "hydraulic-pump-manual.txt",
          mimeType: "text/plain",
          buffer: await import("fs").then((fs) =>
            fs.promises.readFile("tests/fixtures/hydraulic-pump-manual.txt"),
          ),
        },
        title: "Playwright Test Manual",
        comments: "e2e api test",
      },
      timeout: 120_000,
    });
    expect(upload.ok()).toBeTruthy();
    const uploaded = await upload.json();
    expect(uploaded.title).toBe("Playwright Test Manual");

    const search = await request.get(`${API_URL}/search/`, {
      params: { q: "hydraulic pump torque" },
      timeout: 60_000,
    });
    expect(search.ok()).toBeTruthy();
    const results = (await search.json()).results;
    expect(results.length).toBeGreaterThan(0);
  });

  test("part number search finds fixture", async ({ request }) => {
    await request.post(`${API_URL}/documents/upload`, {
      multipart: {
        file: {
          name: "hydraulic-pump-manual.txt",
          mimeType: "text/plain",
          buffer: await import("fs").then((fs) =>
            fs.promises.readFile("tests/fixtures/hydraulic-pump-manual.txt"),
          ),
        },
        title: "PN Search Test",
      },
      timeout: 120_000,
    });

    const response = await request.get(`${API_URL}/search/part-number`, {
      params: { part_number: "HYD-4521" },
    });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).results.length).toBeGreaterThan(0);
  });
});
