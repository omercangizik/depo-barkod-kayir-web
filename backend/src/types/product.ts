import { z } from "zod";
import { PRODUCT_FIELDS, type ProductField } from "../config/constants.js";

const optionalText = z.string().optional().default("");
const optionalNumberLike = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === null ? "" : String(v)));

export const productSchema = z.object({
  barkodNo: z.string().min(1, "Barkod No zorunludur"),
  urunAdi: z.string().min(1, "Ürün adı zorunludur"),
  anaKategori: z.string().min(1, "Ana kategori zorunludur"),
  altKategori: optionalText,
  marka: optionalText,
  urunKodu: optionalText,
  malzeme: optionalText,
  olcu: optionalText,
  hacim: optionalText,
  renk: optionalText,
  paketIciAdet: optionalNumberLike,
  koliIciPaket: optionalNumberLike,
  birim: optionalText,
  mevcutStok: optionalNumberLike,
  minimumStok: optionalNumberLike,
  rafKonum: optionalText,
  alisFiyati: optionalNumberLike,
  satisFiyati: optionalNumberLike,
  kayitTarihi: optionalText,
  guncellemeTarihi: optionalText,
  aciklama: optionalText,
});

export const productUpdateSchema = z.object({
  updates: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).default({}),
  clearFields: z.array(z.string()).default([]),
});

export type Product = z.infer<typeof productSchema> & {
  rowNumber?: number;
};

export type ProductRecord = Record<ProductField, string> & { rowNumber: number };

export function emptyProduct(): ProductRecord {
  const row = { rowNumber: 0 } as ProductRecord;
  for (const field of PRODUCT_FIELDS) {
    row[field] = "";
  }
  return row;
}
