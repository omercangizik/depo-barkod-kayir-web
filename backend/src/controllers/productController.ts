import type { Request, Response } from "express";
import { z } from "zod";
import { MAX_UPLOAD_BYTES, PRODUCT_FORM_FIELDS } from "../config/constants.js";
import { productSchema, productUpdateSchema } from "../types/product.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { normalizeBarcode } from "../utils/text.js";
import {
  applyMapping,
  buildExportWorkbook,
  parseWorkbook,
  suggestMapping,
  type ColumnMapping,
} from "../services/excelService.js";
import {
  createProduct,
  findByBarcode,
  getProductOptions,
  getStats,
  importProducts,
  listProducts,
  updateProduct,
} from "../services/productService.js";
import { readAllProducts } from "../services/sheetsService.js";

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const search = String(req.query.search ?? "");
  const category = String(req.query.category ?? "");
  const incomplete = String(req.query.incomplete ?? "") === "true";
  const data = await listProducts({ page, limit, search, category, incomplete });
  res.json({ success: true, data });
}

export async function stats(_req: Request, res: Response) {
  const data = await getStats();
  res.json({ success: true, data });
}

export async function options(_req: Request, res: Response) {
  const data = await getProductOptions();
  res.json({ success: true, data });
}

export async function getByBarcode(req: Request, res: Response) {
  const barcode = normalizeBarcode(req.params.barcode);
  const product = await findByBarcode(barcode);
  if (!product) throw new NotFoundError("Bu barkod ile ürün bulunamadı");
  res.json({ success: true, data: product });
}

export async function create(req: Request, res: Response) {
  const body = productSchema.parse(req.body);
  const created = await createProduct(body);
  res.status(201).json({ success: true, data: created });
}

export async function update(req: Request, res: Response) {
  const parsed = productUpdateSchema.parse(req.body);
  const updated = await updateProduct(req.params.barcode, parsed.updates, parsed.clearFields);
  res.json({ success: true, data: updated });
}

export async function previewImport(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new AppError("Excel dosyası yükleyin");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("Dosya 10 MB sınırını aşıyor");
  const parsed = await parseWorkbook(file.buffer, file.originalname);
  const mapping = suggestMapping(parsed.headers);
  const previewRows = parsed.rows.slice(0, 8);
  res.json({
    success: true,
    data: {
      headers: parsed.headers,
      suggestedMapping: mapping,
      preview: previewRows,
      totalRows: parsed.totalRows,
      headerRow: parsed.headerRow,
      fields: PRODUCT_FORM_FIELDS,
    },
  });
}

const mappingSchema = z.record(z.string(), z.number());

export async function importFile(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new AppError("Excel dosyası yükleyin");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("Dosya 10 MB sınırını aşıyor");
  let mapping: ColumnMapping = {};
  try {
    if (typeof req.body.mapping === "string" && req.body.mapping) {
      mapping = mappingSchema.parse(JSON.parse(req.body.mapping));
    } else if (req.body.mapping && typeof req.body.mapping === "object") {
      mapping = mappingSchema.parse(req.body.mapping);
    }
  } catch {
    throw new AppError("Kolon eşleştirme bilgisi geçersiz");
  }
  const parsed = await parseWorkbook(file.buffer, file.originalname);
  if (!Object.keys(mapping).length) mapping = suggestMapping(parsed.headers);
  const rows = applyMapping(parsed.rows, mapping, parsed.rowNumbers);
  const report = await importProducts(rows);
  res.json({ success: true, data: report });
}

export async function exportFile(_req: Request, res: Response) {
  const products = await readAllProducts(true);
  const buffer = await buildExportWorkbook(products);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ambalaj_deposu_urun_listesi.xlsx"',
  );
  res.send(buffer);
}
