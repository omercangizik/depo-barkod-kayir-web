import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_CATEGORIES,
  FIELD_LABELS,
  NUMERIC_FIELDS,
  emptyProduct,
  type Product,
  type ProductField,
} from "../types/product";
import { apiClient, getErrorMessage } from "../services/api";
import { Alert } from "./Alert";

const schema = z.object({
  barkodNo: z.string().trim().min(1, "Barkod No zorunludur"),
  koliDisBarkodNo: z.string().optional().default(""),
  urunAdi: z.string().trim().min(1, "Ürün adı zorunludur"),
  anaKategori: z.string().trim().min(1, "Ana kategori zorunludur"),
  altKategori: z.string().optional().default(""),
  marka: z.string().optional().default(""),
  urunKodu: z.string().optional().default(""),
  malzeme: z.string().optional().default(""),
  olcu: z.string().optional().default(""),
  hacim: z.string().optional().default(""),
  renk: z.string().optional().default(""),
  paketIciAdet: z.string().optional().default(""),
  koliIciPaket: z.string().optional().default(""),
  birim: z.string().optional().default(""),
  mevcutStok: z.string().optional().default(""),
  minimumStok: z.string().optional().default(""),
  rafKonum: z.string().optional().default(""),
  alisFiyati: z.string().optional().default(""),
  satisFiyati: z.string().optional().default(""),
  kayitTarihi: z.string().optional().default(""),
  guncellemeTarihi: z.string().optional().default(""),
  aciklama: z.string().optional().default(""),
}).superRefine((data, ctx) => {
  for (const field of NUMERIC_FIELDS) {
    const value = data[field]?.trim();
    if (value && !/^-?\d+([.,]\d+)?$/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sayısal bir değer girin",
        path: [field],
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

const BASIC: ProductField[] = ["barkodNo", "koliDisBarkodNo", "urunAdi", "anaKategori", "altKategori", "marka", "urunKodu"];
const FEATURES: ProductField[] = ["malzeme", "olcu", "hacim", "renk", "paketIciAdet", "koliIciPaket", "birim", "aciklama"];
const STOCK: ProductField[] = ["mevcutStok", "minimumStok", "rafKonum", "alisFiyati", "satisFiyati"];
const REQUIRED: ProductField[] = ["barkodNo", "urunAdi", "anaKategori"];
const FIELD_HELP: Record<ProductField, string> = {
  barkodNo: "Tek ürünün barkodudur. Zorunludur; barkod okutunca buraya gelir.",
  koliDisBarkodNo: "Dış kolinin farklı barkodu varsa girin. İsteğe bağlıdır.",
  urunAdi: "Marka ve özellikleriyle yazın. Örn: 500 CC Sızdırmaz Kap",
  anaKategori: "Ürünün ait olduğu ana grubu seçin.",
  altKategori: "Ürünün daha özel grubunu yazın veya seçin.",
  marka: "Markayı girin. Örn: Limera",
  urunKodu: "Üretici veya tedarikçi ürün kodu.",
  malzeme: "Üretildiği malzemeyi yazın. Örn: Plastik, Karton, Kraft",
  olcu: "Boyutlarını girin. Örn: 20x30 cm",
  hacim: "Kapasitesini girin. Örn: 250 ml, 500 cc",
  renk: "Rengini belirtin. Örn: Şeffaf, Beyaz, Siyah",
  paketIciAdet: "Paketteki ürün sayısı. Örn: 50 adet",
  koliIciPaket: "Kolideki paket sayısı. Örn: 20 paket",
  birim: "Takip birimini yazın. Örn: Adet, Paket, Koli, Rulo",
  mevcutStok: "Depodaki mevcut miktarı girin. Örn: 120",
  minimumStok: "Stok uyarı sınırını girin. Örn: 10",
  rafKonum: "Ürünün depo yerini girin. Örn: K1-A-01",
  alisFiyati: "Birim alış fiyatını girin. Örn: 12,50",
  satisFiyati: "Birim satış fiyatını girin. Örn: 18,00",
  kayitTarihi: "Kayıt tarihi sistem tarafından oluşturulur.",
  guncellemeTarihi: "Güncelleme tarihi sistem tarafından oluşturulur.",
  aciklama: "Ek bilgi veya özel detayları yazın.",
};

type Props = {
  mode: "create" | "edit";
  initial: Product;
  onSaved: (product: Product) => void;
};

export function ProductForm({ mode, initial, onSaved }: Props) {
  const [formMode, setFormMode] = useState(mode);
  const [activeProduct, setActiveProduct] = useState(initial);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subcats, setSubcats] = useState<{ anaKategori: string; altKategori: string }[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const original = useMemo(() => ({ ...activeProduct }), [activeProduct]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyProduct(), ...activeProduct },
  });

  useEffect(() => {
    form.reset({ ...emptyProduct(), ...activeProduct });
  }, [activeProduct, form]);

  useEffect(() => {
    apiClient
      .categories()
      .then((res) => {
        setCategories(res.data.data.anaKategoriler);
        setSubcats(res.data.data.altKategoriler);
      })
      .catch(() => {
        setCategories(DEFAULT_CATEGORIES);
      });
  }, []);

  const anaKategori = form.watch("anaKategori");
  const matchingSubs = subcats.filter((s) => s.anaKategori === anaKategori).map((s) => s.altKategori);

  async function onSubmit(values: FormValues) {
    setMessage(null);
    try {
      if (formMode === "create") {
        const created = await apiClient.createProduct(values as Product);
        setMessage({ type: "success", text: "Ürün kaydedildi." });
        onSaved(created.data.data);
        return;
      }
      const updates: Record<string, string> = {};
      (Object.keys(values) as ProductField[]).forEach((field) => {
        if (field === "barkodNo" || field === "kayitTarihi" || field === "guncellemeTarihi") return;
        const next = (values[field] ?? "").trim();
        const prev = (original[field] ?? "").trim();
        if (next && next !== prev) updates[field] = next;
      });
      if (Object.keys(updates).length === 0) {
        setMessage({ type: "success", text: "Kaydedilecek bir değişiklik yok." });
        return;
      }
      const updated = await apiClient.updateProduct(values.barkodNo, updates, []);
      setMessage({ type: "success", text: "Ürün güncellendi." });
      onSaved(updated.data.data);
    } catch (err) {
      const errorText = getErrorMessage(err);
      if (formMode === "create" && errorText.toLocaleLowerCase("tr-TR").includes("zaten var")) {
        try {
          let existing;
          for (const code of [values.barkodNo.trim(), values.koliDisBarkodNo.trim()].filter(Boolean)) {
            try {
              existing = await apiClient.getByBarcode(code);
              break;
            } catch {
              // The duplicate may be the other barcode field.
            }
          }
          if (!existing) throw new Error("Mevcut ürün bulunamadı");
          const product = existing.data.data;
          setActiveProduct(product);
          setFormMode("edit");
          form.reset({ ...emptyProduct(), ...product });
          setMessage({
            type: "error",
            text: "Bu barkod zaten kayıtlı. Mevcut ürün bilgileri yüklendi; inceleyip isterseniz değişiklikleri kaydedin.",
          });
          return;
        } catch {
          // If the existing record cannot be loaded, keep the original conflict message.
        }
      }
      setMessage({ type: "error", text: errorText });
    }
  }

  function renderField(field: ProductField) {
    const required = REQUIRED.includes(field);
    const disabled = formMode === "edit" && field === "barkodNo";
    const registration = form.register(field);
    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      void registration.onChange(event);
    };
    const common = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-navy";
    return (
      <label key={field} className="block">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700">
            {FIELD_LABELS[field]}
            {required && <span className="text-red-600"> *</span>}
          </span>
        </div>
        {field === "anaKategori" ? (
          <select className={common} {...registration} onChange={onFieldChange} disabled={disabled}>
            <option value="">Seçin</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : field === "aciklama" ? (
          <textarea
            className={common}
            rows={3}
            {...registration}
            onChange={onFieldChange}
            disabled={disabled}
          />
        ) : field === "altKategori" && matchingSubs.length > 0 ? (
          <input className={common} list="alt-kategori-list" {...registration} onChange={onFieldChange} />
        ) : (
          <input
            className={common}
            inputMode={NUMERIC_FIELDS.includes(field) ? "decimal" : "text"}
            {...registration}
            onChange={onFieldChange}
            disabled={disabled}
          />
        )}
        <span className="mt-1 block text-xs leading-5 text-slate-500">{FIELD_HELP[field]}</span>
        {form.formState.errors[field] && (
          <div className="text-xs text-red-700 mt-1">{form.formState.errors[field]?.message}</div>
        )}
      </label>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-navy">Barkod ve temel bilgiler</h2>
        <p className="text-xs text-slate-500">Ürün/iç barkod ve koli dış barkodu ayrı alanlarda tutulur. Koli barkodu yoksa boş bırakabilirsiniz.</p>
        <div className="grid gap-3 sm:grid-cols-2">{BASIC.map(renderField)}</div>
        <datalist id="alt-kategori-list">
          {matchingSubs.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </section>
      <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-navy">Ürün özellikleri</h2>
        <div className="grid gap-3 sm:grid-cols-2">{FEATURES.map(renderField)}</div>
      </section>
      <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-navy">Stok bilgileri</h2>
        <div className="grid gap-3 sm:grid-cols-2">{STOCK.map(renderField)}</div>
      </section>
      {formMode === "edit" && (
        <p className="text-xs text-slate-500">
          Boş bırakılan alanlar mevcut bilgileri korur; kaydetmek için yalnızca zorunlu alanlar doldurulmalıdır.
        </p>
      )}
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full sm:w-auto min-w-48 rounded-2xl bg-navy text-white py-3.5 px-6 font-semibold disabled:opacity-60 mb-4"
      >
        {form.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
