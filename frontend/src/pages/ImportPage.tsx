import { useRef, useState } from "react";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";
import { FIELD_LABELS, PRODUCT_FIELDS, type ImportReport, type ProductField } from "../types/product";

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ProductField, number>>>({});
  const [preview, setPreview] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  async function onFile(next: File | null) {
    const currentRequest = ++requestId.current;
    setFile(next);
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setTotalRows(0);
    setHeaderRow(1);
    setReport(null);
    setError("");
    if (!next) return;
    setBusy(true);
    try {
      const res = await apiClient.previewImport(next);
      if (currentRequest !== requestId.current) return;
      setHeaders(res.data.data.headers);
      setMapping(res.data.data.suggestedMapping);
      setPreview(res.data.data.preview);
      setTotalRows(res.data.data.totalRows);
      setHeaderRow(res.data.data.headerRow);
    } catch (err) {
      if (currentRequest === requestId.current) setError(getErrorMessage(err));
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }

  async function confirm() {
    if (!file) return;
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      const res = await apiClient.importFile(file, mapping);
      if (currentRequest !== requestId.current) return;
      setReport(res.data.data);
    } catch (err) {
      if (currentRequest === requestId.current) setError(getErrorMessage(err));
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-dark">Excel'den Aktar</h1>
      {error && <Alert type="error">{error}</Alert>}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm text-slate-600">XLSX dosyası seçin. İlk satır kolon başlığı olarak kullanılır.</p>
        <input
          type="file"
          disabled={busy}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium"
        />
      </div>
      {headers.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Kolon eşleştirme</h2>
          {!Number.isInteger(mapping.barkodNo) && (
            <p className="text-sm text-amber-800">Aktarım için Barkod No kolonunu eşleştirin.</p>
          )}
          <div className="grid gap-2">
            {PRODUCT_FIELDS.filter((f) => f !== "kayitTarihi" && f !== "guncellemeTarihi").map((field) => (
              <label key={field} className="grid sm:grid-cols-2 gap-2 items-center text-sm">
                <span>{FIELD_LABELS[field]}</span>
                <select
                  className="rounded-xl border border-slate-300 px-3 py-2"
                  value={mapping[field] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => {
                      const selected = e.target.value === "" ? undefined : Number(e.target.value);
                      const next = { ...prev };
                      if (selected === undefined) delete next[field];
                      else {
                        for (const [otherField, column] of Object.entries(next)) {
                          if (otherField !== field && column === selected) {
                            delete next[otherField as ProductField];
                          }
                        }
                        next[field] = selected;
                      }
                      return next;
                    })
                  }
                >
                  <option value="">Eşleştirme yok</option>
                  {headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={i}>
                      {h || `Kolon ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
      {preview.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
          <h2 className="font-semibold mb-2">Önizleme ({totalRows} satır · başlık {headerRow}. satırda)</h2>
          <p className="text-xs text-slate-500 mb-3">
            Eşleştirilen kolonlar dosyadaki gibi aktarılır. Barkodu eşleşen ürünlerde bu kolonların boş hücreleri de mevcut değeri temizler; eşleştirilmeyen kolonlar korunur. Ürün adı ve kategori boş olsa da aktarım yapılır.
          </p>
          <table className="text-xs min-w-full">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-2 py-1 border-b">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {headers.map((_, j) => (
                    <td key={j} className="max-w-48 break-words px-2 py-2 border-b">
                      {row[j]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(mapping).length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold">Eşleştirilmiş veri önizlemesi</h3>
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {PRODUCT_FIELDS.filter((field) => mapping[field] !== undefined && field !== "kayitTarihi" && field !== "guncellemeTarihi").map((field) => (
                      <th key={field} className="border-b px-2 py-1 text-left">{FIELD_LABELS[field]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {PRODUCT_FIELDS.filter((field) => mapping[field] !== undefined && field !== "kayitTarihi" && field !== "guncellemeTarihi").map((field) => {
                        const column = mapping[field] as number;
                        return <td key={field} className="border-b px-2 py-1">{row[column] || "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            disabled={busy || !Number.isInteger(mapping.barkodNo)}
            onClick={confirm}
            className="mt-4 w-full sm:w-auto rounded-xl bg-navy text-white px-6 py-3 font-semibold disabled:opacity-60"
          >
            {busy ? "Aktarılıyor..." : "Aktarımı onayla"}
          </button>
        </div>
      )}
      {report && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <h2 className="font-semibold text-green-800">Aktarım raporu</h2>
          <ul className="text-sm space-y-1">
            <li>Toplam satır: {report.totalRows}</li>
            <li>Yeni eklenen: {report.created}</li>
            <li>Güncellenen: {report.updated}</li>
            <li>Atlanan boş satır: {report.skippedEmpty}</li>
            <li>Hatalı kayıt: {report.errorCount}</li>
          </ul>
          {report.errors.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-1">Satır</th>
                    <th className="py-1">Barkod</th>
                    <th className="py-1">Hata</th>
                  </tr>
                </thead>
                <tbody>
                  {report.errors.map((e, i) => (
                    <tr key={i} className="border-t text-red-800">
                      <td className="py-1">{e.rowIndex}</td>
                      <td className="py-1">{e.barkodNo || "-"}</td>
                      <td className="py-1">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
