import ExcelJS from "exceljs";
import { PRODUCT_FIELDS, PRODUCT_HEADERS, type ProductField } from "../config/constants.js";
import type { ProductRecord } from "../types/product.js";
import { headerToField, normalizeBarcode } from "../utils/text.js";
import { AppError } from "../utils/errors.js";
import type { ImportRow } from "./productService.js";

export type ColumnMapping = Partial<Record<ProductField, number>>;

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((header, index) => {
    const field = headerToField(header);
    if (field && mapping[field] === undefined) mapping[field] = index;
  });
  return mapping;
}

function excelCellToString(value: unknown, asBarcode = false): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object" && value && "text" in (value as { text?: string })) {
    const text = String((value as { text?: string }).text ?? "");
    return asBarcode ? normalizeBarcode(text) : text.trim();
  }
  if (typeof value === "object" && value && "result" in (value as { result?: unknown })) {
    return excelCellToString((value as { result?: unknown }).result, asBarcode);
  }
  if (asBarcode) return normalizeBarcode(value);
  return String(value).trim();
}

export async function parseWorkbook(buffer: Buffer, originalName: string) {
  if (!originalName.toLowerCase().endsWith(".xlsx")) {
    throw new AppError("Yalnızca .xlsx dosyaları destekleniyor. Eski .xls dosyasını .xlsx olarak kaydedip yeniden yükleyin.");
  }
  validateXlsxArchive(buffer);
  try {
    return await parseWithExcelJs(buffer);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Excel dosyası okunamadı. Dosyanın geçerli bir .xlsx çalışma kitabı olduğunu kontrol edin.");
  }
}

function validateXlsxArchive(buffer: Buffer) {
  // Reject malformed archives and ZIP bombs before ExcelJS expands workbook XML in memory.
  const minOffset = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let i = buffer.length - 22; i >= minOffset; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      endOffset = i;
      break;
    }
  }
  if (endOffset < 0) throw new AppError("Geçerli bir XLSX dosyası yükleyin.");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  let offset = buffer.readUInt32LE(endOffset + 16);
  if (entryCount < 1 || entryCount > 1000 || offset + directorySize > endOffset) {
    throw new AppError("Excel dosyasının yapısı geçersiz veya çok büyük.");
  }
  let totalUncompressed = 0;
  let hasWorkbook = false;
  for (let i = 0; i < entryCount; i += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new AppError("Excel dosyasının yapısı geçersiz.");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    if (offset + recordLength > buffer.length || (flags & 1) !== 0 || ![0, 8].includes(method)) {
      throw new AppError("Excel dosyasının sıkıştırma biçimi desteklenmiyor.");
    }
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    hasWorkbook ||= name === "xl/workbook.xml";
    totalUncompressed += uncompressedSize;
    if (
      uncompressedSize > 20 * 1024 * 1024 ||
      totalUncompressed > 50 * 1024 * 1024 ||
      (compressedSize === 0 ? uncompressedSize > 0 : uncompressedSize / compressedSize > 200)
    ) {
      throw new AppError("Excel dosyası güvenli boyut sınırlarını aşıyor.");
    }
    offset += recordLength;
  }
  if (!hasWorkbook) throw new AppError("Yüklenen dosya geçerli bir XLSX çalışma kitabı değil.");
}

async function parseWithExcelJs(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { headers: [] as string[], rows: [] as string[][], rowNumbers: [] as number[], headerRow: 1, totalRows: 0 };
  }
  if (sheet.rowCount > 10_000 || sheet.columnCount > 100) {
    throw new AppError("Excel dosyası en fazla 10.000 satır ve 100 sütun içerebilir.");
  }
  const matrix: string[][] = [];
  const rowNumbers: number[] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = [];
    const cellCount = Math.max(sheet.columnCount, row.cellCount);
    for (let i = 1; i <= cellCount; i += 1) {
      const cell = row.getCell(i);
      const display = cell.text ? String(cell.text) : excelCellToString(cell.value);
      values.push(display);
    }
    matrix.push(values);
    rowNumbers.push(row.number);
  });
  return matrixToTable(matrix, rowNumbers);
}

function matrixToTable(matrix: string[][], sourceRowNumbers: number[]) {
  // Older stock workbooks often have a title or export timestamp above the actual header.
  // Pick the best matching row in the first 20 rows, while keeping row 1 as a safe fallback.
  const scanRows = Math.min(matrix.length, 20);
  let headerIndex = 0;
  let bestScore = -1;
  for (let index = 0; index < scanRows; index += 1) {
    const fields = (matrix[index] ?? []).map((cell) => headerToField(String(cell ?? "")));
    const score = new Set(fields.filter(Boolean)).size;
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  }
  const headers = (matrix[headerIndex] ?? []).map((h) => String(h ?? "").trim());
  const data = matrix.slice(headerIndex + 1);
  const rowNumbers = sourceRowNumbers.slice(headerIndex + 1);
  const rows = data.map((row) => headers.map((_, i) => String(row?.[i] ?? "").trim()));
  return {
    headers,
    rows,
    rowNumbers,
    headerRow: sourceRowNumbers[headerIndex] ?? headerIndex + 1,
    totalRows: rows.length,
  };
}

export function applyMapping(rows: string[][], mapping: ColumnMapping, rowNumbers?: number[]): ImportRow[] {
  return rows.map((row, index) => {
    const mapped: ImportRow = { rowIndex: rowNumbers?.[index] ?? index + 2 };
    for (const field of PRODUCT_FIELDS) {
      const col = mapping[field];
      if (col === undefined || col === null || col < 0) continue;
      const value = row[col] ?? "";
      // A mapped empty cell is intentional: imports mirror the file and can
      // clear an existing value. Unmapped columns remain untouched.
      mapped[field] = field === "barkodNo" || field === "koliDisBarkodNo"
        ? normalizeBarcode(value)
        : String(value).trim();
    }
    return mapped;
  });
}

export async function buildExportWorkbook(products: ProductRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Öztürk Ambalaj Deposu";
  const sheet = workbook.addWorksheet("Urunler");
  sheet.columns = PRODUCT_HEADERS.map((header, i) => ({
    header,
    key: PRODUCT_FIELDS[i],
    width: header.length < 14 ? 16 : 28,
  }));
  sheet.getRow(1).font = { bold: true };
  for (const product of products) {
    const values = PRODUCT_FIELDS.map((field) => {
      if (field === "barkodNo" || field === "koliDisBarkodNo") return String(product[field] ?? "");
      return product[field] ?? "";
    });
    const row = sheet.addRow(values);
    row.getCell(PRODUCT_FIELDS.indexOf("barkodNo") + 1).numFmt = "@";
    row.getCell(PRODUCT_FIELDS.indexOf("koliDisBarkodNo") + 1).numFmt = "@";
  }
  sheet.getColumn(PRODUCT_FIELDS.indexOf("barkodNo") + 1).numFmt = "@";
  sheet.getColumn(PRODUCT_FIELDS.indexOf("koliDisBarkodNo") + 1).numFmt = "@";
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
