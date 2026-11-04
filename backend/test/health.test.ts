import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { PRODUCT_FIELDS, PRODUCT_HEADERS } from "../src/config/constants.js";
import { emptyProduct } from "../src/types/product.js";
import { productToRow } from "../src/services/sheetsService.js";
import { headerToField } from "../src/utils/text.js";

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

describe("Google Sheets product column mapping", () => {
  it("keeps every saved product value in the matching header order", () => {
    assert.equal(PRODUCT_HEADERS.length, PRODUCT_FIELDS.length);
    const product = emptyProduct();
    PRODUCT_FIELDS.forEach((field, index) => {
      product[field] = `alan-${index + 1}`;
    });
    assert.deepEqual(productToRow(product), PRODUCT_FIELDS.map((_, index) => `alan-${index + 1}`));
  });

  it("writes cleared values as empty cells instead of shifting later values", () => {
    const product = emptyProduct();
    product.barkodNo = "8691234567890";
    product.koliDisBarkodNo = "";
    product.urunAdi = "Sızdırmaz Kap";
    const row = productToRow(product);
    assert.equal(row[PRODUCT_FIELDS.indexOf("barkodNo")], "8691234567890");
    assert.equal(row[PRODUCT_FIELDS.indexOf("koliDisBarkodNo")], "");
    assert.equal(row[PRODUCT_FIELDS.indexOf("urunAdi")], "Sızdırmaz Kap");
  });

  it("recognizes the canonical Turkish header for the carton barcode", () => {
    assert.equal(headerToField("Koli Dış Barkod No"), "koliDisBarkodNo");
    assert.equal(PRODUCT_HEADERS[PRODUCT_FIELDS.indexOf("koliDisBarkodNo")], "Koli Dış Barkod No");
  });

  it("maps manufacturer product code and stock code to different sheet columns", () => {
    const manufacturerCodeColumn = PRODUCT_FIELDS.indexOf("urunKodu");
    const stockCodeColumn = PRODUCT_FIELDS.indexOf("stokKodu");
    assert.notEqual(manufacturerCodeColumn, stockCodeColumn);
    assert.equal(headerToField("Üretici Ürün Kodu"), "urunKodu");
    assert.equal(headerToField("Stok Kodu"), "stokKodu");
    assert.equal(PRODUCT_HEADERS[manufacturerCodeColumn], "Üretici Ürün Kodu");
    assert.equal(PRODUCT_HEADERS[stockCodeColumn], "Stok Kodu");
  });
});
