import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";
import type { ProductStats } from "../types/product";

export function DashboardPage() {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .stats()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingStats(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-dark">Ana Sayfa</h1>
        <p className="text-slate-600 text-sm mt-1">Barkod okutarak ürün kaydı oluşturun veya bilgileri tamamlayın.</p>
      </div>
      {error && (
        <Alert type="error">
          <div>{error}</div>
          {error.toLocaleLowerCase("tr-TR").includes("servis hesab") && (
            <p className="mt-2 text-xs">
              Google Cloud’da Sheets API’yi açın, JSON anahtarı indirin, dosyayı
              backend/google-credentials.json olarak kaydedin ve tabloyu servis hesabı
              e-postasıyla Düzenleyici olarak paylaşın. Ayrıntılar README.md içinde.
            </p>
          )}
        </Alert>
      )}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat title="Toplam ürün" value={loadingStats ? "…" : stats?.total ?? "-"} />
        <Stat title="Bugün eklenen" value={loadingStats ? "…" : stats?.addedToday ?? "-"} />
        <Stat title="Bugün güncellenen" value={loadingStats ? "…" : stats?.updatedToday ?? "-"} />
      </div>
      <div className="grid gap-3">
        <button
          onClick={() => navigate("/scan")}
          className="min-h-16 w-full rounded-2xl bg-navy py-5 text-lg font-semibold text-white shadow-md"
        >
          Barkod Okut
        </button>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Action to="/products/new" label="Manuel Ürün Ekle" />
          <Action to="/products" label="Ürün Listesi" />
        </div>
      </div>
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Son güncellenen ürünler</h2>
        <div className="space-y-2">
          {loadingStats && <p className="text-sm text-slate-500">Ürünler yükleniyor...</p>}
          {!loadingStats && (stats?.recent ?? []).length === 0 && (
            <p className="text-sm text-slate-500">Henüz ürün yok.</p>
          )}
          {(stats?.recent ?? []).map((p) => (
            <Link
              key={p.barkodNo}
              to={`/products/${encodeURIComponent(p.barkodNo)}`}
              className="block rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50"
            >
              <div className="font-medium">{p.urunAdi || "İsimsiz ürün"}</div>
              <div className="text-xs text-slate-500">
                {p.barkodNo} · {p.anaKategori || "Kategori yok"} · {p.guncellemeTarihi}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <div className="text-xs leading-tight text-slate-500 sm:text-sm">{title}</div>
      <div className="mt-1 break-words text-xl font-bold text-navy sm:text-2xl">{value}</div>
    </div>
  );
}

function Action({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center text-sm font-medium text-slate-800 sm:text-base"
    >
      {label}
    </Link>
  );
}
