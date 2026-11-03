import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { useDebounce } from "../hooks/useDebounce";
import { apiClient, getErrorMessage } from "../services/api";
import type { Product } from "../types/product";

export function ProductListPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [category, setCategory] = useState("");
  const [incomplete, setIncomplete] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.categories().then((res) => setCategories(res.data.data.anaKategoriler)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debounced, category, incomplete]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    apiClient
      .products({ search: debounced, category, incomplete, page, limit: 20 })
      .then((res) => {
        if (ignore) return;
        setItems(res.data.data.items);
        setTotalPages(res.data.data.totalPages);
        setTotal(res.data.data.total);
      })
      .catch((err) => {
        if (!ignore) {
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [debounced, category, incomplete, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-dark sm:text-2xl">Ürün Listesi</h1>
        <Link to="/products/new" className="flex min-h-11 shrink-0 items-center rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">
          Yeni
        </Link>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid min-w-0 gap-2 sm:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün adı veya barkod"
          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 bg-white rounded-xl border border-slate-300 px-3 py-3">
          <input type="checkbox" checked={incomplete} onChange={(e) => setIncomplete(e.target.checked)} />
          Eksik bilgili ürünler
        </label>
      </div>
      <p className="text-sm text-slate-500">{loading ? "Yükleniyor..." : `${total} kayıt`}</p>

      {!loading && items.length === 0 && !error && (
        <p className="text-sm text-slate-500 bg-white rounded-2xl p-4">Kayıt bulunamadı.</p>
      )}

      <div className="lg:hidden space-y-3">
        {items.map((p) => (
          <button
            key={p.barkodNo}
            onClick={() => navigate(`/products/${encodeURIComponent(p.barkodNo)}`)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="font-semibold">{p.urunAdi || "İsimsiz ürün"}</div>
            <div className="text-sm text-slate-500 mt-1">{p.barkodNo}</div>
            <div className="text-sm mt-2 text-slate-700">{p.anaKategori || "-"} · {p.marka || "-"}</div>
            <div className="text-xs text-slate-500 mt-1">{p.malzeme || "-"} · {p.rafKonum || "Raf yok"}</div>
          </button>
        ))}
      </div>

      <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Barkod No</th>
              <th className="px-4 py-3">Ürün Adı</th>
              <th className="px-4 py-3">Ana Kategori</th>
              <th className="px-4 py-3">Marka</th>
              <th className="px-4 py-3">Malzeme</th>
              <th className="px-4 py-3">Raf / Konum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr
                key={p.barkodNo}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`/products/${encodeURIComponent(p.barkodNo)}`)}
              >
                <td className="px-4 py-3 font-mono">{p.barkodNo}</td>
                <td className="px-4 py-3">{p.urunAdi}</td>
                <td className="px-4 py-3">{p.anaKategori}</td>
                <td className="px-4 py-3">{p.marka}</td>
                <td className="px-4 py-3">{p.malzeme}</td>
                <td className="px-4 py-3">{p.rafKonum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 pb-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="min-h-11 rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
        >
          Önceki
        </button>
        <span className="text-sm">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="min-h-11 rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
