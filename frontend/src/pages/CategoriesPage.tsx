import { useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";
import { DEFAULT_CATEGORIES, type Categories } from "../types/product";

export function CategoriesPage() {
  const [data, setData] = useState<Categories | null>(null);
  const [ana, setAna] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.categories();
      setData(res.data.data);
      if (!ana && res.data.data.anaKategoriler[0]) setAna(res.data.data.anaKategoriler[0]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      await apiClient.addSubcategory(ana, alt);
      setAlt("");
      setOk("Alt kategori eklendi.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-dark">Kategoriler</h1>
      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}
      {loading && <p className="text-sm text-slate-500">Kategoriler yükleniyor...</p>}
      {!loading && !data && !error && <p className="text-sm text-slate-500">Kategori bilgisi alınamadı.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.anaKategoriler ?? DEFAULT_CATEGORIES).map((name) => {
          const subs = (data?.altKategoriler ?? []).filter((s) => s.anaKategori === name);
          return (
            <div key={name} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-semibold text-navy">{name}</div>
              {subs.length === 0 ? (
                <p className="text-sm text-slate-500 mt-2">Alt kategori yok</p>
              ) : (
                <ul className="mt-2 text-sm text-slate-700 list-disc pl-4">
                  {subs.map((s) => (
                    <li key={s.altKategori}>{s.altKategori}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={add} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">Alt kategori ekle</h2>
        <select className="w-full rounded-xl border px-3 py-3" value={ana} onChange={(e) => setAna(e.target.value)}>
          {(data?.anaKategoriler ?? DEFAULT_CATEGORIES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-xl border px-3 py-3"
          placeholder="Alt kategori"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          required
        />
        <button disabled={busy} className="rounded-xl bg-navy text-white px-5 py-3 font-semibold disabled:opacity-60">
          {busy ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>
    </div>
  );
}
