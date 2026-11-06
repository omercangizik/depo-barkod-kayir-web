import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  FIELD_LABELS,
  emptyProduct,
  type Product,
  type ProductField,
} from "../types/product";
import { apiClient, getErrorMessage } from "../services/api";
import { Alert } from "./Alert";

const schema = z.object({
  barkodNo: z.string().trim().min(1, "Barkod No zorunludur"),
  urunAdi: z.string().trim().min(1, "Ürün adı zorunludur"),
  koliDisBarkodNo: z.string().optional().default(""),
  anaKategori: z.string().trim().min(1, "Ana kategori zorunludur"),
  altKategori: z.string().optional().default(""),
  disKutuBoyutu: z.string().optional().default(""),
  marka: z.string().optional().default(""),
  urunKodu: z.string().optional().default(""),
  stokKodu: z.string().optional().default(""),
  malzeme: z.string().optional().default(""),
  olcu: z.string().optional().default(""),
  hacim: z.string().optional().default(""),
  renk: z.string().optional().default(""),
  paketIciAdet: z.string().optional().default(""),
  koliIciPaket: z.string().optional().default(""),
  birim: z.string().optional().default(""),
  rafKonum: z.string().optional().default(""),
}).superRefine((data, ctx) => {
  for (const field of ["paketIciAdet", "koliIciPaket"] as const) {
    const value = data[field]?.trim();
    if (value && !/^-?\d+([.,]\d+)?$/.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sayısal bir değer girin", path: [field] });
    }
  }
});

type FormValues = z.infer<typeof schema>;
const FORM_FIELDS = [
  "barkodNo", "urunAdi", "koliDisBarkodNo", "anaKategori", "altKategori", "disKutuBoyutu", "marka", "urunKodu", "stokKodu",
  "malzeme", "olcu", "hacim", "renk", "paketIciAdet", "koliIciPaket", "birim", "rafKonum",
] as const satisfies readonly ProductField[];
type FormField = (typeof FORM_FIELDS)[number];
const REQUIRED: FormField[] = ["barkodNo", "urunAdi", "anaKategori"];
const NUMERIC_FIELDS: FormField[] = ["paketIciAdet", "koliIciPaket"];
const AUTOCOMPLETE_FIELDS: FormField[] = ["marka", "malzeme", "renk", "birim", "rafKonum"];
const FIELD_HELP: Record<FormField, string> = {
  barkodNo: "Tek ürünün barkodudur. Zorunludur.",
  urunAdi: "Marka ve özellikleriyle yazın. Örn: 500 CC Sızdırmaz Kap",
  koliDisBarkodNo: "Dış kolinin farklı barkodu varsa girin. İsteğe bağlıdır.",
  anaKategori: "Ürünün ait olduğu ana grubu seçin.",
  altKategori: "Seçtiğiniz ana gruba uygun alt kategoriyi seçin. İsteğe bağlıdır.",
  disKutuBoyutu: "Dış kolinin ölçüsünü girin. Örn: 40 × 30 × 25 cm",
  marka: "Listeden seçin veya yeni bir marka yazın.",
  urunKodu: "Üreticinin ürüne verdiği kodu girin.",
  stokKodu: "İşletmenizin ürün için kullandığı stok kodu.",
  malzeme: "Listeden seçin veya yeni bir malzeme yazın.",
  olcu: "Boyutlarını girin. Örn: 20x30 cm",
  hacim: "Kapasitesini girin. Örn: 250 ml, 500 cc",
  renk: "Listeden seçin veya yeni bir renk yazın.",
  paketIciAdet: "Paketteki ürün sayısı. Örn: 50",
  koliIciPaket: "Kolideki paket sayısı. Örn: 20",
  birim: "Listeden seçin veya yeni bir birim yazın.",
  rafKonum: "Listeden seçin veya yeni konum yazın. Örn: K1-A-01",
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
  const [subcategories, setSubcategories] = useState<{ anaKategori: string; altKategori: string }[]>(
    Object.entries(DEFAULT_SUBCATEGORIES).flatMap(([anaKategori, values]) => values.map((altKategori) => ({ anaKategori, altKategori }))),
  );
  const [options, setOptions] = useState<Partial<Record<FormField, string[]>>>({});
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
    apiClient.categories().then((res) => {
      setCategories(res.data.data.anaKategoriler);
      setSubcategories(res.data.data.altKategoriler);
    }).catch(() => {
      setCategories(DEFAULT_CATEGORIES);
      setSubcategories(Object.entries(DEFAULT_SUBCATEGORIES).flatMap(([anaKategori, values]) => values.map((altKategori) => ({ anaKategori, altKategori }))));
    });
    apiClient.productOptions().then((res) => setOptions(res.data.data)).catch(() => setOptions({}));
  }, []);

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
      FORM_FIELDS.forEach((field) => {
        if (field === "barkodNo") return;
        const next = values[field].trim();
        const prev = (original[field] ?? "").trim();
        if (next !== prev) updates[field] = next;
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
          const existing = await apiClient.getByBarcode(values.barkodNo.trim());
          const product = existing.data.data;
          setActiveProduct(product);
          setFormMode("edit");
          form.reset({ ...emptyProduct(), ...product });
          setMessage({ type: "error", text: "Bu barkod zaten kayıtlı. Mevcut ürün bilgileri yüklendi; inceleyip değişiklikleri kaydedin." });
          return;
        } catch {
          // Preserve the original conflict message if the existing item is unavailable.
        }
      }
      setMessage({ type: "error", text: errorText });
    }
  }

  function renderField(field: FormField) {
    const required = REQUIRED.includes(field);
    const disabled = formMode === "edit" && field === "barkodNo";
    const registration = form.register(field);
    const common = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-navy";
    const availableSubcategories = subcategories
      .filter((item) => item.anaKategori === form.watch("anaKategori"))
      .map((item) => item.altKategori);
    const currentSubcategory = form.watch("altKategori");
    return (
      <label key={field} className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {FIELD_LABELS[field]}
          {required && <span className="text-red-600"> *</span>}
        </span>
        {field === "anaKategori" ? (
          <select className={common} {...registration} disabled={disabled} onChange={(event) => {
            registration.onChange(event);
            form.setValue("altKategori", "");
          }}>
            <option value="">Seçin</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        ) : field === "altKategori" ? (
          <select className={common} {...registration} disabled={disabled || !form.watch("anaKategori")}>
            <option value="">Alt kategori seçin (isteğe bağlı)</option>
            {currentSubcategory && !availableSubcategories.includes(currentSubcategory) && (
              <option value={currentSubcategory}>{currentSubcategory}</option>
            )}
            {availableSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
          </select>
        ) : (
          <input
            className={common}
            inputMode={NUMERIC_FIELDS.includes(field) ? "decimal" : "text"}
            list={AUTOCOMPLETE_FIELDS.includes(field) ? `options-${field}` : undefined}
            {...registration}
            disabled={disabled}
          />
        )}
        {AUTOCOMPLETE_FIELDS.includes(field) && (
          <datalist id={`options-${field}`}>
            {(options[field] ?? []).map((option) => <option key={option} value={option} />)}
          </datalist>
        )}
        <span className="mt-1 block text-xs leading-5 text-slate-500">{FIELD_HELP[field]}</span>
        {form.formState.errors[field] && <span className="mt-1 block text-xs text-red-700">{form.formState.errors[field]?.message}</span>}
      </label>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <div className="space-y-4">{FORM_FIELDS.map(renderField)}</div>
      {formMode === "edit" && <p className="text-xs text-slate-500">Boş bırakılan alanlar boş olarak kaydedilir; barkod, ürün adı ve ana kategori zorunludur.</p>}
      <button type="submit" disabled={form.formState.isSubmitting} className="w-full rounded-2xl bg-navy px-6 py-3.5 font-semibold text-white disabled:opacity-60 sm:w-auto sm:min-w-48">
        {form.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
