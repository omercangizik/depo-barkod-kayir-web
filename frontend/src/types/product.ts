export const PRODUCT_FIELDS = [
  "barkodNo",
  "koliDisBarkodNo",
  "urunAdi",
  "anaKategori",
  "altKategori",
  "marka",
  "urunKodu",
  "stokKodu",
  "malzeme",
  "olcu",
  "hacim",
  "renk",
  "paketIciAdet",
  "koliIciPaket",
  "birim",
  "mevcutStok",
  "minimumStok",
  "rafKonum",
  "alisFiyati",
  "satisFiyati",
  "kayitTarihi",
  "guncellemeTarihi",
  "aciklama",
] as const;

export type ProductField = (typeof PRODUCT_FIELDS)[number];

export const DEFAULT_CATEGORIES = [
  "Ambalaj ve Gıda Kapları",
  "Bardak ve İçecek Ambalajları",
  "Tabak, Çatal, Kaşık ve Bıçak",
  "Kutu ve Gıda Ambalajları",
  "Kağıt ve Peçete Ürünleri",
  "Poşet ve Torba Ürünleri",
  "Folyo, Streç ve Sarma Ürünleri",
  "Temizlik ve Hijyen Ürünleri",
  "Eldiven ve Koruyucu Ürünler",
  "Servis ve Sunum Ürünleri",
  "Ambalaj ve Kargo Malzemeleri",
  "Teneke, Kova ve Kavanoz",
  "Baskılı ve Özel Üretim Ürünler",
  "Diğer Ürünler",
];

export type Product = Record<ProductField, string> & { rowNumber?: number };

export const FIELD_LABELS: Record<ProductField, string> = {
  barkodNo: "Ürün / İç Barkod No",
  koliDisBarkodNo: "Koli Dış Barkod No",
  urunAdi: "Ürün Adı",
  anaKategori: "Ana Kategori",
  altKategori: "Alt Kategori",
  marka: "Marka",
  urunKodu: "Üretici Ürün Kodu",
  stokKodu: "Stok Kodu",
  malzeme: "Malzeme",
  olcu: "Ölçü / Ebat",
  hacim: "Hacim",
  renk: "Renk",
  paketIciAdet: "Paket İçi Adet",
  koliIciPaket: "Koli İçi Paket",
  birim: "Birim",
  mevcutStok: "Mevcut Stok",
  minimumStok: "Minimum Stok",
  rafKonum: "Depo Konumu",
  alisFiyati: "Alış Fiyatı",
  satisFiyati: "Satış Fiyatı",
  kayitTarihi: "Kayıt Tarihi",
  guncellemeTarihi: "Güncelleme Tarihi",
  aciklama: "Açıklama",
};

export const NUMERIC_FIELDS: ProductField[] = [
  "paketIciAdet",
  "koliIciPaket",
  "mevcutStok",
  "minimumStok",
  "alisFiyati",
  "satisFiyati",
];

export type ApiError = { message: string; code?: string };

export type PaginatedProducts = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductStats = {
  total: number;
  incomplete: number;
  addedToday: number;
  updatedToday: number;
  recent: Product[];
};

export type Categories = {
  anaKategoriler: string[];
  altKategoriler: { anaKategori: string; altKategori: string }[];
};

export type ImportReport = {
  totalRows: number;
  created: number;
  updated: number;
  skippedEmpty: number;
  errorCount: number;
  errors: { rowIndex: number; barkodNo: string; reason: string }[];
};

export function emptyProduct(): Product {
  return PRODUCT_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as Product);
}
