import {
  INCOMPLETE_CHECK_FIELDS,
  NUMERIC_FIELDS,
  PRODUCT_FIELDS,
  type ProductField,
} from "../config/constants.js";
import { productSchema, type ProductRecord } from "../types/product.js";
import { AppError, ConflictError, NotFoundError } from "../utils/errors.js";
import { isToday, nowStamp } from "../utils/dates.js";
import { withBarcodeLock, withSheetLock } from "../utils/mutex.js";
import {
  isBlank,
  normalizeBarcode,
  sanitizeNumeric,
  validateNumericField,
} from "../utils/text.js";
import {
  appendProducts,
  readAllProducts,
  updateProductRows,
} from "./sheetsService.js";

function isIncomplete(product: ProductRecord): boolean {
  return INCOMPLETE_CHECK_FIELDS.some((field) => isBlank(product[field]));
}

function mergeProduct(
  existing: ProductRecord,
  updates: Record<string, unknown>,
  clearFields: string[],
): ProductRecord {
  const next = { ...existing };
  const clear = new Set(clearFields);
  for (const field of PRODUCT_FIELDS) {
    if (field === "barkodNo" || field === "kayitTarihi") continue;
    if (clear.has(field)) {
      next[field] = "";
      continue;
    }
    if (!(field in updates)) continue;
    const raw = updates[field];
    if (raw === null) continue;
    const value = String(raw ?? "").trim();
    if (isBlank(value)) {
      next[field] = "";
      continue;
    }
    next[field] = NUMERIC_FIELDS.includes(field as (typeof NUMERIC_FIELDS)[number])
      ? sanitizeNumeric(value)
      : value;
  }
  next.guncellemeTarihi = nowStamp();
  return next;
}

function validateUpdates(updates: Record<string, unknown>) {
  const editableFields = new Set<string>(PRODUCT_FIELDS.filter(
    (field) => field !== "barkodNo" && field !== "kayitTarihi" && field !== "guncellemeTarihi",
  ));
  for (const [field, value] of Object.entries(updates)) {
    if (!editableFields.has(field)) {
      throw new AppError(`Güncellenemeyen alan: ${field}`, 400, "VALIDATION_ERROR");
    }
    const text = value === null || value === undefined ? "" : String(value);
    const error = validateNumericField(field, text);
    if (error) throw new AppError(error, 400, "VALIDATION_ERROR");
  }
}

export async function listProducts(query: {
  search?: string;
  category?: string;
  incomplete?: boolean;
  page?: number;
  limit?: number;
}) {
  const all = await readAllProducts();
  const search = (query.search ?? "").trim().toLocaleLowerCase("tr-TR");
  const category = (query.category ?? "").trim();
  let filtered = all;
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.barkodNo.toLocaleLowerCase("tr-TR").includes(search) ||
        p.urunAdi.toLocaleLowerCase("tr-TR").includes(search),
    );
  }
  if (category) {
    filtered = filtered.filter((p) => p.anaKategori === category);
  }
  if (query.incomplete) {
    filtered = filtered.filter(isIncomplete);
  }
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const start = (page - 1) * limit;
  return {
    items: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

export async function getStats() {
  const all = await readAllProducts();
  const recent = [...all]
    .sort((a, b) => String(b.guncellemeTarihi).localeCompare(String(a.guncellemeTarihi)))
    .slice(0, 8);
  return {
    total: all.length,
    incomplete: all.filter(isIncomplete).length,
    addedToday: all.filter((p) => isToday(p.kayitTarihi)).length,
    updatedToday: all.filter((p) => isToday(p.guncellemeTarihi) && !isToday(p.kayitTarihi)).length,
    recent,
  };
}

export async function getProductOptions() {
  const all = await readAllProducts();
  const fields = ["marka", "malzeme", "renk", "birim", "rafKonum"] as const;
  return Object.fromEntries(fields.map((field) => [
    field,
    [...new Set(all.map((product) => product[field].trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr-TR")),
  ])) as Record<(typeof fields)[number], string[]>;
}

export async function findByBarcode(barcode: string) {
  const code = normalizeBarcode(barcode);
  const all = await readAllProducts();
  return all.find((p) => p.barkodNo === code) ?? null;
}

async function findByAnyBarcode(barcode: string) {
  const code = normalizeBarcode(barcode);
  const all = await readAllProducts();
  return all.find((p) => p.barkodNo === code || p.koliDisBarkodNo === code) ?? null;
}

export async function createProduct(input: Record<string, unknown>) {
  const parsed = productSchema.parse({
    ...input,
    barkodNo: normalizeBarcode(input.barkodNo),
    koliDisBarkodNo: normalizeBarcode(input.koliDisBarkodNo),
    urunAdi: String(input.urunAdi ?? "").trim(),
    anaKategori: String(input.anaKategori ?? "").trim(),
  });
  for (const field of NUMERIC_FIELDS) {
    const error = validateNumericField(field, String(parsed[field] ?? ""));
    if (error) throw new AppError(error, 400, "VALIDATION_ERROR");
  }
  if (parsed.koliDisBarkodNo && parsed.koliDisBarkodNo === parsed.barkodNo) {
    throw new AppError("Ürün/iç barkod ile koli dış barkodu farklı olmalıdır", 400, "VALIDATION_ERROR");
  }
  return withBarcodeLock(parsed.barkodNo, () =>
    withSheetLock(async () => {
      const existing = await findByAnyBarcode(parsed.barkodNo) ?? (parsed.koliDisBarkodNo ? await findByAnyBarcode(parsed.koliDisBarkodNo) : null);
      if (existing) {
        throw new ConflictError("Bu barkod ile kayıtlı bir ürün zaten var");
      }
      const stamp = nowStamp();
      const row = {
        ...parsed,
        kayitTarihi: stamp,
        guncellemeTarihi: stamp,
        rowNumber: 0,
      } as ProductRecord;
      for (const field of NUMERIC_FIELDS) {
        row[field] = sanitizeNumeric(String(row[field] ?? ""));
      }
      await appendProducts([row]);
      return row;
    }),
  );
}

export async function updateProduct(
  barcode: string,
  updates: Record<string, unknown>,
  clearFields: string[],
) {
  const code = normalizeBarcode(barcode);
  validateUpdates(updates);
  const editableFields = new Set<string>(PRODUCT_FIELDS.filter(
    (field) => field !== "barkodNo" && field !== "kayitTarihi" && field !== "guncellemeTarihi",
  ));
  for (const field of clearFields) {
    if (!editableFields.has(field)) {
      throw new AppError(`Temizlenemeyen alan: ${field}`, 400, "VALIDATION_ERROR");
    }
  }
  return withBarcodeLock(code, () =>
    withSheetLock(async () => {
      const existing = await findByBarcode(code);
      if (!existing) throw new NotFoundError("Bu barkod ile ürün bulunamadı");
      const merged = mergeProduct(existing, updates, clearFields);
      for (const value of [merged.barkodNo, merged.koliDisBarkodNo].filter(Boolean)) {
        const collision = await findByAnyBarcode(value);
        if (collision && collision.rowNumber !== existing.rowNumber) {
          throw new ConflictError("Bu barkod başka bir üründe kayıtlı");
        }
      }
      if (isBlank(merged.urunAdi) || isBlank(merged.anaKategori) || isBlank(merged.barkodNo)) {
        throw new AppError("Barkod, ürün adı ve ana kategori boş bırakılamaz", 400, "VALIDATION_ERROR");
      }
      await updateProductRows([merged]);
      return merged;
    }),
  );
}

export type ImportRow = Partial<Record<ProductField, string>> & {
  rowIndex: number;
};

export type ImportError = {
  rowIndex: number;
  barkodNo: string;
  reason: string;
};

export async function importProducts(rows: ImportRow[]) {
  return withSheetLock(async () => {
    const existing = await readAllProducts(true);
    const byBarcode = new Map<string, ProductRecord>();
    for (const product of existing) {
      if (product.barkodNo) byBarcode.set(product.barkodNo, product);
      if (product.koliDisBarkodNo) byBarcode.set(product.koliDisBarkodNo, product);
    }
    const toUpdate: ProductRecord[] = [];
    const toCreate: ProductRecord[] = [];
    const errors: ImportError[] = [];
    let skippedEmpty = 0;
    const seenInFile = new Set<string>();

    for (const row of rows) {
      const hasAny = PRODUCT_FIELDS.some((f) => !isBlank(row[f]));
      if (!hasAny) {
        skippedEmpty += 1;
        continue;
      }
      const barkodNo = normalizeBarcode(row.barkodNo);
      const koliDisBarkodNo = normalizeBarcode(row.koliDisBarkodNo);
      const fileCodes = [barkodNo, koliDisBarkodNo].filter(Boolean);
      if (fileCodes.some((code) => seenInFile.has(code))) {
        errors.push({
          rowIndex: row.rowIndex,
          barkodNo,
          reason: "Dosya içinde aynı barkod birden fazla kez geçiyor",
        });
        continue;
      }
      fileCodes.forEach((code) => seenInFile.add(code));

      let numericError: string | null = null;
      for (const field of NUMERIC_FIELDS) {
        numericError = validateNumericField(field, String(row[field] ?? ""));
        if (numericError) break;
      }
      if (numericError) {
        errors.push({ rowIndex: row.rowIndex, barkodNo, reason: numericError });
        continue;
      }

      const current = (barkodNo && byBarcode.get(barkodNo)) || (koliDisBarkodNo && byBarcode.get(koliDisBarkodNo));
      if (current) {
        const merged = { ...current };
        for (const field of PRODUCT_FIELDS) {
          if (!(field in row) || field === "barkodNo" || field === "kayitTarihi") continue;
          const value = String(row[field] ?? "").trim();
          merged[field] = NUMERIC_FIELDS.includes(field as (typeof NUMERIC_FIELDS)[number])
            ? (value ? sanitizeNumeric(value) : "")
            : value;
        }
        merged.guncellemeTarihi = nowStamp();
        toUpdate.push(merged);
        if (merged.barkodNo) byBarcode.set(merged.barkodNo, merged);
        if (merged.koliDisBarkodNo) byBarcode.set(merged.koliDisBarkodNo, merged);
      } else {
        const stamp = nowStamp();
        const created = {
          barkodNo,
          koliDisBarkodNo,
          urunAdi: String(row.urunAdi ?? "").trim(),
          anaKategori: String(row.anaKategori ?? "").trim(),
          altKategori: String(row.altKategori ?? "").trim(),
          marka: String(row.marka ?? "").trim(),
          urunKodu: String(row.urunKodu ?? "").trim(),
          stokKodu: String(row.stokKodu ?? "").trim(),
          malzeme: String(row.malzeme ?? "").trim(),
          olcu: String(row.olcu ?? "").trim(),
          hacim: String(row.hacim ?? "").trim(),
          renk: String(row.renk ?? "").trim(),
          paketIciAdet: sanitizeNumeric(String(row.paketIciAdet ?? "")),
          koliIciPaket: sanitizeNumeric(String(row.koliIciPaket ?? "")),
          birim: String(row.birim ?? "").trim(),
          mevcutStok: sanitizeNumeric(String(row.mevcutStok ?? "")),
          minimumStok: sanitizeNumeric(String(row.minimumStok ?? "")),
          rafKonum: String(row.rafKonum ?? "").trim(),
          alisFiyati: sanitizeNumeric(String(row.alisFiyati ?? "")),
          satisFiyati: sanitizeNumeric(String(row.satisFiyati ?? "")),
          kayitTarihi: stamp,
          guncellemeTarihi: stamp,
          rowNumber: 0,
        } as ProductRecord;
        toCreate.push(created);
        if (barkodNo) byBarcode.set(barkodNo, created);
        if (koliDisBarkodNo) byBarcode.set(koliDisBarkodNo, created);
      }
    }

    await updateProductRows(toUpdate);
    await appendProducts(toCreate);

    return {
      totalRows: rows.length,
      created: toCreate.length,
      updated: toUpdate.length,
      skippedEmpty,
      errorCount: errors.length,
      errors,
    };
  });
}
