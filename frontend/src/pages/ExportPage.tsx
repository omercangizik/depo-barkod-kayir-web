import { useState } from "react";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";

export function ExportPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await apiClient.exportFile();
      setOk("Excel dosyası indirildi: ambalaj_deposu_urun_listesi.xlsx");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-dark">Excel'e Aktar</h1>
      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm text-slate-600">
          Google Sheets üzerindeki bütün ürünler Excel olarak indirilir. Barkodlar metin olarak saklanır.
        </p>
        <button
          onClick={download}
          disabled={busy}
          className="w-full sm:w-auto rounded-xl bg-navy text-white px-6 py-3 font-semibold disabled:opacity-60"
        >
          {busy ? "Hazırlanıyor..." : "Excel indir"}
        </button>
      </div>
    </div>
  );
}
