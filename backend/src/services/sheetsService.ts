import type { sheets_v4 } from "googleapis";
import {
  CATEGORIES_SHEET_TITLE,
  DEFAULT_CATEGORIES,
  LEGACY_CATEGORY_MAP,
  PRODUCT_FIELDS,
  PRODUCT_HEADERS,
  PRODUCTS_SHEET_TITLE,
  type ProductField,
} from "../config/constants.js";
import { env } from "../config/env.js";
import { emptyProduct, type ProductRecord } from "../types/product.js";
import { SheetsError } from "../utils/errors.js";
import { headerToField, normalizeBarcode, normalizeHeader } from "../utils/text.js";
import { getSheetsClient } from "./sheetsAuth.js";

type SheetMeta = { title: string; sheetId: number; columnCount: number };

let cachedProducts: { rows: ProductRecord[]; loadedAt: number } | null = null;
const CACHE_MS = 2500;
let productsSheetTitle = PRODUCTS_SHEET_TITLE;
let categoriesSheetTitle = CATEGORIES_SHEET_TITLE;
let productColumnIndexes: number[] = PRODUCT_FIELDS.map((_, index) => index);
let structureReady = false;
let structurePromise: Promise<void> | null = null;

function wrapSheetsError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (/invalid_grant|invalid_client|DECODER|PEM|credentials/i.test(message)) {
    throw new SheetsError("Google kimlik bilgileri geçersiz. Servis hesabı anahtarını kontrol edin.");
  }
  if (/not found|404/i.test(message)) {
    throw new SheetsError("Google Sheets belgesi bulunamadı. Spreadsheet ID değerini kontrol edin.");
  }
  if (/permission|403|insufficient/i.test(message)) {
    throw new SheetsError(
      "Google Sheets erişim izni yok. Tabloyu servis hesabı e-postasıyla düzenleyici olarak paylaşın.",
    );
  }
  if (/has not been used|api .*disabled|service_disabled/i.test(message)) {
    throw new SheetsError(
      "Google Sheets API kapalı. Google Cloud Console'da servis hesabının projesi için Sheets API'yi etkinleştirip birkaç dakika bekleyin.",
    );
  }
  throw new SheetsError("Google Sheets işlemi başarısız oldu. Bağlantı ve erişim ayarlarını kontrol edin.");
}

async function sheets() {
  return getSheetsClient();
}

export function invalidateProductCache() {
  cachedProducts = null;
}

export async function getSpreadsheetInfo() {
  try {
    const client = await sheets();
    const res = await client.spreadsheets.get({
      spreadsheetId: env.spreadsheetId,
      fields: "properties.title,sheets.properties",
    });
    const titles =
      res.data.sheets?.map((s) => s.properties?.title ?? "").filter(Boolean) ?? [];
    return {
      title: res.data.properties?.title ?? "",
      sheets: titles,
    };
  } catch (err) {
    wrapSheetsError(err);
  }
}

async function listSheets(client: sheets_v4.Sheets): Promise<SheetMeta[]> {
  const res = await client.spreadsheets.get({
    spreadsheetId: env.spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(columnCount)))",
  });
  return (
    res.data.sheets
      ?.map((s) => ({
        title: s.properties?.title ?? "",
        sheetId: s.properties?.sheetId ?? 0,
        columnCount: s.properties?.gridProperties?.columnCount ?? 26,
      }))
      .filter((s) => s.title) ?? []
  );
}

async function addSheet(client: sheets_v4.Sheets, title: string) {
  await client.spreadsheets.batchUpdate({
    spreadsheetId: env.spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }],
    },
  });
}

async function readRange(client: sheets_v4.Sheets, range: string): Promise<string[][]> {
  const res = await client.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return (res.data.values as string[][] | undefined) ?? [];
}

function looksLikeProductHeader(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  const mapped = row.map((cell) => headerToField(String(cell ?? "")));
  return mapped.some((field) => field === "barkodNo" || field === "urunAdi");
}

async function resolveProductsSheet(client: sheets_v4.Sheets, metas: SheetMeta[]) {
  const urunler = metas.find((s) => normalizeHeader(s.title) === normalizeHeader(PRODUCTS_SHEET_TITLE));
  if (urunler) {
    productsSheetTitle = urunler.title;
    return;
  }
  for (const meta of metas) {
    const values = await readRange(client, `'${meta.title}'!A1:T1`);
    if (looksLikeProductHeader(values[0])) {
      productsSheetTitle = meta.title;
      return;
    }
  }
  await addSheet(client, PRODUCTS_SHEET_TITLE);
  productsSheetTitle = PRODUCTS_SHEET_TITLE;
  await client.spreadsheets.values.update({
    spreadsheetId: env.spreadsheetId,
    range: `'${productsSheetTitle}'!A1:T1`,
    valueInputOption: "RAW",
    requestBody: { values: [ [...PRODUCT_HEADERS] ] },
  });
}

async function ensureCategorySheet(client: sheets_v4.Sheets, metas: SheetMeta[]) {
  const existing = metas.find(
    (s) => normalizeHeader(s.title) === normalizeHeader(CATEGORIES_SHEET_TITLE),
  );
  categoriesSheetTitle = existing?.title ?? CATEGORIES_SHEET_TITLE;
  if (!existing) {
    await addSheet(client, categoriesSheetTitle);
  }
  const categoryHeaders = await readRange(client, `'${categoriesSheetTitle}'!A1:B1`);
  if (!categoryHeaders[0]?.some((cell) => String(cell ?? "").trim())) {
    await client.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `'${categoriesSheetTitle}'!A1:B1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Ana Kategori", "Alt Kategori"]] },
    });
  }
  const existingRows = await readRange(client, `'${categoriesSheetTitle}'!A2:B`);
  const normalizedLegacy = new Map(
    Object.entries(LEGACY_CATEGORY_MAP).map(([oldName, newName]) => [normalizeHeader(oldName), newName]),
  );
  const normalizedMain = (value: string) => normalizedLegacy.get(normalizeHeader(value)) ?? value;
  const normalizedRows: string[][] = DEFAULT_CATEGORIES.map((name) => [name, ""]);
  const presentRows = new Set(normalizedRows.map((row) => `${normalizeHeader(row[0])}|`));
  for (const row of existingRows) {
    const oldMain = String(row[0] ?? "").trim();
    const subcategory = String(row[1] ?? "").trim();
    if (!oldMain) continue;
    const main = normalizedMain(oldMain);
    const key = `${normalizeHeader(main)}|${normalizeHeader(subcategory)}`;
    if (!presentRows.has(key)) {
      normalizedRows.push([main, subcategory]);
      presentRows.add(key);
    }
  }
  const original = existingRows.map((row) => [String(row[0] ?? "").trim(), String(row[1] ?? "").trim()]);
  const same = original.length === normalizedRows.length && original.every(
    (row, index) => row[0] === normalizedRows[index]?.[0] && row[1] === normalizedRows[index]?.[1],
  );
  if (!same) {
    await client.spreadsheets.values.clear({
      spreadsheetId: env.spreadsheetId,
      range: `'${categoriesSheetTitle}'!A2:B`,
    });
    await client.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `'${categoriesSheetTitle}'!A2:B${normalizedRows.length + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: normalizedRows },
    });
  }
}

async function migrateProductCategories(client: sheets_v4.Sheets) {
  const mainCategoryColumn = productColumnIndexes[PRODUCT_FIELDS.indexOf("anaKategori")];
  if (mainCategoryColumn === undefined) return;
  const column = columnLetter(mainCategoryColumn + 1);
  const values = await readRange(client, `'${productsSheetTitle}'!${column}2:${column}`);
  const updates = values.flatMap((row, index) => {
    const current = String(row[0] ?? "").trim();
    const normalized = normalizeHeader(current);
    const target = Object.entries(LEGACY_CATEGORY_MAP).find(([oldName]) => normalizeHeader(oldName) === normalized)?.[1];
    return target ? [{ range: `'${productsSheetTitle}'!${column}${index + 2}`, values: [[target]] }] : [];
  });
  for (let index = 0; index < updates.length; index += 80) {
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId: env.spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates.slice(index, index + 80) },
    });
  }
  if (updates.length) invalidateProductCache();
}

async function ensureProductHeaders(client: sheets_v4.Sheets) {
  const productSheet = (await listSheets(client)).find((sheet) => sheet.title === productsSheetTitle);
  if (!productSheet) {
    throw new SheetsError(`Google Sheets içinde "${productsSheetTitle}" sekmesi bulunamadı.`);
  }
  const lastColumn = columnLetter(productSheet.columnCount);
  const values = await readRange(client, `'${productsSheetTitle}'!A1:${lastColumn}`);
  const headerRow = values[0] ?? [];
  if (!headerRow.length || headerRow.every((c) => !String(c ?? "").trim())) {
    await client.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `'${productsSheetTitle}'!A1:T1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...PRODUCT_HEADERS]] },
    });
    productColumnIndexes = PRODUCT_FIELDS.map((_, index) => index);
    return;
  }

  // Keep one column per known field. If old sheets contain duplicate labels,
  // merge blanks from later columns into the first column before removing them.
  const fieldColumns = new Map<ProductField, number[]>();
  headerRow.forEach((header, column) => {
    const field = headerToField(String(header ?? ""));
    if (field) fieldColumns.set(field, [...(fieldColumns.get(field) ?? []), column]);
  });
  const duplicateColumns: number[] = [];
  for (const [field, columns] of fieldColumns) {
    const primary = columns[0];
    const canonicalHeader = PRODUCT_HEADERS[PRODUCT_FIELDS.indexOf(field)];
    if (String(headerRow[primary] ?? "").trim() !== canonicalHeader) {
      await client.spreadsheets.values.update({
        spreadsheetId: env.spreadsheetId,
        range: `'${productsSheetTitle}'!${columnLetter(primary + 1)}1`,
        valueInputOption: "RAW",
        requestBody: { values: [[canonicalHeader]] },
      });
    }
    if (columns.length < 2) continue;
    const mergedRows = values.slice(1).map((row) => {
      const primaryValue = String(row[primary] ?? "").trim();
      if (primaryValue) return [row[primary] ?? ""];
      const fallbackColumn = columns.slice(1).find((column) => String(row[column] ?? "").trim());
      return [fallbackColumn === undefined ? "" : row[fallbackColumn] ?? ""];
    });
    const primaryValues = values.slice(1).map((row) => [row[primary] ?? ""]);
    if (mergedRows.some((row, index) => String(row[0] ?? "") !== String(primaryValues[index]?.[0] ?? ""))) {
      await client.spreadsheets.values.update({
        spreadsheetId: env.spreadsheetId,
        range: `'${productsSheetTitle}'!${columnLetter(primary + 1)}2:${columnLetter(primary + 1)}${mergedRows.length + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: mergedRows },
      });
    }
    duplicateColumns.push(...columns.slice(1));
  }

  if (duplicateColumns.length) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: env.spreadsheetId,
      requestBody: {
        requests: duplicateColumns
          .sort((a, b) => b - a)
          .map((column) => ({
            deleteDimension: {
              range: {
                sheetId: productSheet.sheetId,
                dimension: "COLUMNS" as const,
                startIndex: column,
                endIndex: column + 1,
              },
            },
          })),
      },
    });
  }

  const currentSheet = (await listSheets(client)).find((sheet) => sheet.title === productsSheetTitle);
  if (!currentSheet) {
    throw new SheetsError(`Google Sheets içinde "${productsSheetTitle}" sekmesi bulunamadı.`);
  }
  const repairedValues = await readRange(client, `'${productsSheetTitle}'!A1:${columnLetter(currentSheet.columnCount)}`);
  const repairedHeaders = repairedValues[0] ?? [];
  const missingFields = PRODUCT_FIELDS.flatMap((field, index) =>
    repairedHeaders.some((header) => headerToField(String(header ?? "")) === field)
      ? []
      : [{ field, header: PRODUCT_HEADERS[index] }],
  );
  const missing = missingFields.map(({ header }) => header);
  if (missing.length) {
    const startCol = repairedHeaders.length + 1;
    const requiredColumns = startCol + missing.length - 1;
    if (requiredColumns > currentSheet.columnCount) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: env.spreadsheetId,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: currentSheet.sheetId,
                gridProperties: { columnCount: requiredColumns },
              },
              fields: "gridProperties.columnCount",
            },
          }],
        },
      });
    }
    await client.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `'${productsSheetTitle}'!${columnLetter(startCol)}1:${columnLetter(startCol + missing.length - 1)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing] },
    });
    const endColumn = columnLetter(startCol + missing.length - 1);
    const repaired = (await readRange(client, `'${productsSheetTitle}'!A1:${endColumn}1`))[0] ?? [];
    const unresolved = PRODUCT_FIELDS.filter(
      (field) => !repaired.some((header) => headerToField(String(header ?? "")) === field),
    );
    if (unresolved.length) {
      throw new SheetsError(
        `Ürün başlıkları oluşturulamadı: ${unresolved.map((field) => PRODUCT_HEADERS[PRODUCT_FIELDS.indexOf(field)]).join(", ")}.`,
      );
    }
  }
}

async function refreshProductColumnIndexes(client: sheets_v4.Sheets) {
  // A user may clear the spreadsheet while the server is still running.
  // Recreate/repair headers before selecting columns for a read or write.
  await ensureProductHeaders(client);
  const values = await readRange(client, `'${productsSheetTitle}'!A1:AZ1`);
  const headers = values[0] ?? [];
  const used = new Set<number>();
  const refreshed = PRODUCT_FIELDS.map((field) => {
    const column = headers.findIndex(
      (header, index) => headerToField(String(header ?? "")) === field && !used.has(index),
    );
    if (column < 0) {
      throw new SheetsError(`Google Sheets başlığında "${PRODUCT_HEADERS[PRODUCT_FIELDS.indexOf(field)]}" kolonu bulunamadı.`);
    }
    used.add(column);
    return column;
  });
  productColumnIndexes = refreshed;
}

function columnLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function ensureStructure() {
  if (structureReady) return;
  if (!structurePromise) {
    structurePromise = (async () => {
      try {
        const client = await sheets();
        const metas = await listSheets(client);
        await resolveProductsSheet(client, metas);
        await ensureProductHeaders(client);
        await refreshProductColumnIndexes(client);
        const refreshed = await listSheets(client);
        await ensureCategorySheet(client, refreshed);
        await migrateProductCategories(client);
        structureReady = true;
      } catch (err) {
        structurePromise = null;
        if (err instanceof SheetsError) throw err;
        wrapSheetsError(err);
      }
    })();
  }
  await structurePromise;
}

function mapRow(row: unknown[], rowNumber: number): ProductRecord {
  const product = emptyProduct();
  product.rowNumber = rowNumber;
  PRODUCT_FIELDS.forEach((field, index) => {
    const raw = row[productColumnIndexes[index]];
    product[field] = field === "barkodNo" ? normalizeBarcode(raw) : String(raw ?? "").trim();
  });
  return product;
}

export async function readAllProducts(force = false): Promise<ProductRecord[]> {
  await ensureStructure();
  if (!force && cachedProducts && Date.now() - cachedProducts.loadedAt < CACHE_MS) {
    return cachedProducts.rows;
  }
  try {
    const client = await sheets();
    await refreshProductColumnIndexes(client);
    // Whole-column notation is accepted consistently by the Sheets API; the
    // previous open-ended A1:T form can be rejected as an invalid range.
    const values = await readRange(client, `'${productsSheetTitle}'!A:${columnLetter(Math.max(...productColumnIndexes) + 1)}`);
    const rows: ProductRecord[] = [];
    for (let i = 1; i < values.length; i += 1) {
      const mapped = mapRow(values[i] ?? [], i + 1);
      if (!mapped.barkodNo && !mapped.urunAdi) continue;
      rows.push(mapped);
    }
    cachedProducts = { rows, loadedAt: Date.now() };
    return rows;
  } catch (err) {
    wrapSheetsError(err);
  }
}

export function productToRow(product: ProductRecord): string[] {
  const row = Array.from({ length: Math.max(...productColumnIndexes) + 1 }, () => "");
  PRODUCT_FIELDS.forEach((field, index) => {
    row[productColumnIndexes[index]] = product[field] ?? "";
  });
  return row;
}

export async function appendProducts(products: ProductRecord[]) {
  if (!products.length) return;
  await ensureStructure();
  try {
    const client = await sheets();
    await refreshProductColumnIndexes(client);
    const chunkSize = 500;
    for (let i = 0; i < products.length; i += chunkSize) {
      await client.spreadsheets.values.append({
        spreadsheetId: env.spreadsheetId,
        range: `'${productsSheetTitle}'!A:${columnLetter(Math.max(...productColumnIndexes) + 1)}`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: products.slice(i, i + chunkSize).map(productToRow) },
      });
    }
    invalidateProductCache();
  } catch (err) {
    wrapSheetsError(err);
  }
}

export async function updateProductRows(products: ProductRecord[]) {
  if (!products.length) return;
  await ensureStructure();
  try {
    const client = await sheets();
    await refreshProductColumnIndexes(client);
    const data = products.flatMap((product) => {
      const cells = PRODUCT_FIELDS.map((field, index) => ({
        column: productColumnIndexes[index],
        value: product[field] ?? "",
      })).sort((a, b) => a.column - b.column);
      const ranges: { range: string; values: string[][] }[] = [];
      for (const cell of cells) {
        const previous = ranges[ranges.length - 1];
        if (previous) {
          const endMatch = previous.range.match(/!([A-Z]+)\d+:([A-Z]+)\d+$/);
          const endColumn = endMatch?.[2];
          const nextColumn = columnLetter(cell.column + 1);
          if (endColumn && columnLetter(columnIndex(endColumn) + 2) === nextColumn) {
            previous.range = previous.range.replace(/:[A-Z]+(\d+)$/, `:${nextColumn}$1`);
            previous.values[0].push(cell.value);
            continue;
          }
        }
        const column = columnLetter(cell.column + 1);
        ranges.push({
          range: `'${productsSheetTitle}'!${column}${product.rowNumber}:${column}${product.rowNumber}`,
          values: [[cell.value]],
        });
      }
      return ranges;
    });
    const chunkSize = 80;
    for (let i = 0; i < data.length; i += chunkSize) {
      await client.spreadsheets.values.batchUpdate({
        spreadsheetId: env.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: data.slice(i, i + chunkSize),
        },
      });
    }
    invalidateProductCache();
  } catch (err) {
    wrapSheetsError(err);
  }
}

function columnIndex(column: string): number {
  return [...column].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

export async function readCategories() {
  await ensureStructure();
  try {
    const client = await sheets();
    await ensureCategorySheet(client, await listSheets(client));
    const values = await readRange(client, `'${categoriesSheetTitle}'!A2:B`);
    const ana = new Set<string>(DEFAULT_CATEGORIES);
    const alt: { anaKategori: string; altKategori: string }[] = [];
    for (const row of values) {
      const main = String(row[0] ?? "").trim();
      const sub = String(row[1] ?? "").trim();
      if (main) ana.add(main);
      if (main && sub) alt.push({ anaKategori: main, altKategori: sub });
    }
    return {
      anaKategoriler: Array.from(ana),
      altKategoriler: alt,
    };
  } catch (err) {
    wrapSheetsError(err);
  }
}

export async function appendSubcategory(anaKategori: string, altKategori: string) {
  await ensureStructure();
  try {
    const client = await sheets();
    await ensureCategorySheet(client, await listSheets(client));
    await client.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `'${categoriesSheetTitle}'!A:B`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[anaKategori, altKategori]] },
    });
  } catch (err) {
    wrapSheetsError(err);
  }
}

export function getProductsSheetTitle() {
  return productsSheetTitle;
}

export type { ProductField };
