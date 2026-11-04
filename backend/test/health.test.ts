import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";

describe("HTTP readiness and API access", () => {
  let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
  let baseUrl = "";

  before(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("returns healthy for the Render process check without touching Sheets", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: { api: true } });
  });

  it("does not try to serve the Vercel frontend from the Render API service", async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      error: { message: "İstenen kaynak bulunamadı", code: "NOT_FOUND" },
    });
  });

  it("does not require a login session for product routes", async () => {
    const response = await fetch(`${baseUrl}/api/products/stats`);
    assert.notEqual(response.status, 401);
  });

  it("does not expose obsolete login endpoints", async () => {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    assert.equal(response.status, 404);
  });
});
