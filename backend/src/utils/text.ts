import type { ProductField } from "../config/constants.js";
import { FIELD_ALIASES, NUMERIC_FIELDS, PRODUCT_FIELDS } from "../config/constants.js";

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replace(/\s+/g, " ");
}

export function headerToField(header: string): ProductField | null {
  const normalized = normalizeHeader(header);
  // Normalize aliases too: Turkish dotted/dotless i and accented letters
  // otherwise make labels such as "Ürün Adı" fail to match their alias.
  const alias = Object.entries(FIELD_ALIASES).find(
    ([name]) => normalizeHeader(name) === normalized,
  )?.[1];
  if (alias) return alias;
  const exact = PRODUCT_FIELDS.find((field) => normalizeHeader(field) === normalized);
  return exact ?? null;
}

export function normalizeBarcode(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Number.isInteger(value)) return String(value);
    const asInt = Math.round(value);
    if (Math.abs(value - asInt) < 1e-6) return String(asInt);
    return String(value);
  }
  let text = String(value).trim();
  if (!text) return "";
  if (/^\d+\.?\d*e\+\d+$/i.test(text)) {
    const num = Number(text);
    if (Number.isFinite(num)) return BigInt(Math.round(num)).toString();
  }
  if (text.endsWith(".0") && /^\d+\.0$/.test(text)) {
    text = text.slice(0, -2);
  }
  return text;
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function validateNumericField(field: string, value: string): string | null {
  if (!NUMERIC_FIELDS.includes(field as (typeof NUMERIC_FIELDS)[number])) return null;
  if (isBlank(value)) return null;
  const normalized = value.replace(",", ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return `${field} sayısal olmalıdır`;
  }
  return null;
}

export function sanitizeNumeric(value: string): string {
  if (isBlank(value)) return "";
  return value.replace(",", ".").trim();
}
