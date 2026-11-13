import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { ProductForm } from "../components/ProductForm";
import { apiClient, getErrorMessage } from "../services/api";
import { emptyProduct, type Product } from "../types/product";

const CHECKS_KEY = "ozturk-depo-location-checks-v1";
const CHECKS_DRAFT_KEY = "ozturk-depo-location-checks-draft-v1";
const FILTERS_KEY = "ozturk-depo-location-check-filters-v1";

function readChecks(key = CHECKS_KEY): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function readFilters() {
  try {
    const value = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? sessionStorage.getItem(FILTERS_KEY) ?? "{}") as Partial<{ category: string; location: string; search: string }>;
    return { category: value.category ?? "", location: value.location ?? "", search: value.search ?? "" };
  } catch {
    return { category: "", location: "", search: "" };
  }
}

export function InventoryCheckPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [initialFilters] = useState(readFilters);
  const [category, setCategory] = useState(initialFilters.category);
  const [location, setLocation] = useState(initialFilters.location);
  const [search, setSearch] = useState(initialFilters.search);
  const [savedChecks, setSavedChecks] = useState<Record<string, boolean>>(readChecks);
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      const draft = localStorage.getItem(CHECKS_DRAFT_KEY);
      return draft ? JSON.parse(draft) as Record<string, boolean> : readChecks();
    } catch {
      return readChecks();
    }
  });
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>(emptyProduct);
  const [saveMessage, setSaveMessage] = useState("");
  const [savingChecks, setSavingChecks] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  async function loadProducts(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const first = await apiClient.products({ page: 1, limit: 100 });
      const all = [...first.data.data.items];
      for (let page = 2; page <= first.data.data.totalPages; page += 1) {
        const next = await apiClient.products({ page, limit: 100 });
        all.push(...next.data.data.items);
      }
      setProducts(all);
    } catch (err) {
      setError(getErrorMessage(err));
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKS_DRAFT_KEY, JSON.stringify(checks));
    } catch {
      // Keep in-memory selections if this browser blocks local storage.
    }
  }, [checks]);

  useEffect(() => {
    try {
      const filters = JSON.stringify({ category, location, search });
      localStorage.setItem(FILTERS_KEY, filters);
      sessionStorage.setItem(FILTERS_KEY, filters);
    } catch {
      // Filters still work for the current visit when session storage is unavailable.
    }
  }, [category, location, search]);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.anaKategori.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr-TR")),
    [products],
  );
  const locations = useMemo(
    () => [...new Set(products.map((product) => product.rafKonum.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr-TR", { numeric: true })),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return products.filter((product) => {
      if (category && product.anaKategori !== category) return false;
      if (location && product.rafKonum !== location) return false;
      if (!normalizedSearch) return true;
      return [product.urunAdi, product.barkodNo, product.koliDisBarkodNo]
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedSearch));
    });
  }, [products, category, location, search]);

  const checkedCount = filteredProducts.filter((product) => checks[product.barkodNo]).length;
  async function saveChecks() {
    if (!filteredProducts.length) return;
    setSavingChecks(true);
    setError("");
    setSaveMessage("");
    try {
      const response = await apiClient.saveInventoryCheck({
        anaKategoriFiltresi: category,
        konumFiltresi: location,
        items: filteredProducts.map((product) => ({
          barkodNo: product.barkodNo,
          urunAdi: product.urunAdi,
          anaKategori: product.anaKategori,
          rafKonum: product.rafKonum,
          kontrolEdildi: Boolean(checks[product.barkodNo]),
        })),
      });
      const nextSavedChecks = { ...savedChecks };
      filteredProducts.forEach((product) => {
        if (checks[product.barkodNo]) nextSavedChecks[product.barkodNo] = true;
        else delete nextSavedChecks[product.barkodNo];
      });
      setSavedChecks(nextSavedChecks);
      try {
        localStorage.setItem(CHECKS_KEY, JSON.stringify(nextSavedChecks));
      } catch {
        // The authoritative inventory check record has already been stored in Sheets.
      }
      setSaveMessage(`${response.data.data.savedCount} ürünün kontrol durumu Google Sheets’te “${response.data.data.sheetTitle}” sekmesine kaydedildi.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingChecks(false);
    }
  }

  function openAddProduct() {
    const initial = emptyProduct();
    if (category) initial.anaKategori = category;
    if (location) initial.rafKonum = location;
    setNewProduct(initial);
    setAddProductOpen(true);
    setSaveMessage("");
  }

  function productSaved(product: Product) {
    setAddProductOpen(false);
    setSaveMessage(`${product.urunAdi || "Ürün"} kaydedildi; liste yenilendi.`);
    void loadProducts(true);
  }

  function toggleCheck(barcode: string) {
    const next = { ...checks, [barcode]: !checks[barcode] };
    setChecks(next);
    try {
      localStorage.setItem(CHECKS_DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Keep the selection in memory if browser storage is unavailable.
    }
  }

  function clearVisibleChecks() {
    const next = { ...checks };
    filteredProducts.forEach((product) => delete next[product.barkodNo]);
    setChecks(next);
    try {
      localStorage.setItem(CHECKS_DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Keep the updated selection in memory if browser storage is unavailable.
    }
  }

  function updateFilters(next: { category?: string; location?: string; search?: string }) {
    const filters = {
      category: next.category ?? category,
      location: next.location ?? location,
      search: next.search ?? search,
    };
    try {
      const serialized = JSON.stringify(filters);
      localStorage.setItem(FILTERS_KEY, serialized);
      sessionStorage.setItem(FILTERS_KEY, serialized);
    } catch {
      // Filtering stays active in memory if storage is unavailable.
    }
    if (next.category !== undefined) setCategory(next.category);
    if (next.location !== undefined) setLocation(next.location);
    if (next.search !== undefined) setSearch(next.search);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-dark sm:text-2xl">Konum ve Kategori Kontrolü</h1>
          <p className="mt-1 text-sm text-slate-600">Raf veya konumdaki ürünleri süzün ve sayım sırasında işaretleyin.</p>
        </div>
        <button type="button" onClick={() => void loadProducts(true)} disabled={refreshing} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {refreshing ? "Yenileniyor..." : "Listeyi yenile"}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <select aria-label="Kategoriye göre filtrele" value={category} onChange={(event) => updateFilters({ category: event.target.value })} className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3">
          <option value="">Tüm kategoriler</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Konuma göre filtrele" value={location} onChange={(event) => updateFilters({ location: event.target.value })} className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3">
          <option value="">Tüm konumlar</option>
          {locations.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <input aria-label="Ürün ara" value={search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Ürün adı veya barkod ara" className="min-w-0 rounded-xl border border-slate-300 px-3 py-3" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600">{loading ? "Ürünler yükleniyor..." : `${filteredProducts.length} ürün · ${checkedCount} kontrol edildi`}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openAddProduct} className="min-h-10 rounded-xl border border-orange-300 bg-white px-3 py-2 font-semibold text-orange-800 hover:bg-orange-50">Eksik ürün mü? Ekle</button>
          {checkedCount > 0 && <button type="button" onClick={clearVisibleChecks} className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">Görünen işaretleri kaldır</button>}
          <button type="button" onClick={() => void saveChecks()} disabled={savingChecks || !filteredProducts.length} className="min-h-10 rounded-xl bg-navy px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{savingChecks ? "Kaydediliyor..." : "Kaydet"}</button>
        </div>
      </div>
      {saveMessage && <Alert type="success">{saveMessage}</Alert>}

      {!loading && filteredProducts.length === 0 && !error && <div className="rounded-2xl bg-white p-4 text-sm text-slate-600">Bu filtrelerde ürün bulunamadı. Ürün eksikse <button type="button" onClick={openAddProduct} className="font-semibold text-orange-800 underline underline-offset-2">buradan ekleyebilirsiniz</button>.</div>}

      <div className="space-y-2 lg:hidden">
        {filteredProducts.map((product) => (
          <article key={product.barkodNo} className={`rounded-2xl border bg-white p-4 shadow-sm ${checks[product.barkodNo] ? "border-green-300" : "border-slate-100"}`}>
            <div className="flex items-start gap-3">
              <input aria-label={`${product.urunAdi} kontrol edildi`} type="checkbox" checked={Boolean(checks[product.barkodNo])} onChange={() => toggleCheck(product.barkodNo)} className="mt-1 h-5 w-5 shrink-0 accent-green-700" />
              <button type="button" onClick={() => navigate(`/products/${encodeURIComponent(product.barkodNo)}`, { state: { returnTo: "/inventory" } })} className="min-w-0 flex-1 text-left">
                <span className="block font-semibold text-slate-900">{product.urunAdi || "İsimsiz ürün"}</span>
                <span className="mt-1 block text-sm text-slate-500">Barkod: {product.barkodNo || "-"}</span>
                <span className="mt-2 block text-sm text-slate-700">{product.anaKategori || "Kategorisiz"}{product.altKategori ? ` · ${product.altKategori}` : ""}</span>
                <span className="mt-1 block text-sm font-medium text-orange-800">Konum: {product.rafKonum || "Konum girilmemiş"}</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="px-4 py-3">Kontrol</th><th className="px-4 py-3">Ürün Adı</th><th className="px-4 py-3">Barkod</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Konum</th>
          </tr></thead>
          <tbody>{filteredProducts.map((product) => (
            <tr key={product.barkodNo} className="cursor-pointer border-t border-slate-100 hover:bg-orange-50/40" onClick={() => navigate(`/products/${encodeURIComponent(product.barkodNo)}`, { state: { returnTo: "/inventory" } })}>
              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input aria-label={`${product.urunAdi} kontrol edildi`} type="checkbox" checked={Boolean(checks[product.barkodNo])} onChange={() => toggleCheck(product.barkodNo)} className="h-5 w-5 accent-green-700" /></td>
              <td className="px-4 py-3 font-medium">{product.urunAdi || "İsimsiz ürün"}</td><td className="px-4 py-3 font-mono">{product.barkodNo || "-"}</td><td className="px-4 py-3">{product.anaKategori || "-"}{product.altKategori ? ` · ${product.altKategori}` : ""}</td><td className="px-4 py-3">{product.rafKonum || "Konum girilmemiş"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {addProductOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-2 sm:p-5" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAddProductOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-add-title" className="mx-auto my-2 max-w-2xl rounded-2xl bg-surface p-3 shadow-2xl sm:my-6 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="inventory-add-title" className="text-lg font-bold text-navy-dark sm:text-xl">Eksik Ürün Ekle</h2>
                <p className="mt-1 text-xs text-slate-600">Normal ürün kaydıyla aynı zorunlu alanlar ve kaydetme işlemi kullanılır.</p>
              </div>
              <button type="button" onClick={() => setAddProductOpen(false)} aria-label="Ürün ekleme penceresini kapat" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">Kapat</button>
            </div>
            <ProductForm mode="create" initial={newProduct} onSaved={productSaved} />
          </section>
        </div>
      )}
    </div>
  );
}
