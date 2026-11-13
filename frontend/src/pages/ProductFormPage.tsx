import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";
import { emptyProduct, type Product } from "../types/product";

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const { barcode } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    if (mode === "create") {
      const initial = emptyProduct();
      const scannedField = params.get("barcodeField") === "koliDisBarkodNo"
        ? "koliDisBarkodNo"
        : "barkodNo";
      initial.barkodNo = params.get("innerBarcode") ?? (scannedField === "barkodNo" ? params.get("barcode") : null) ?? "";
      initial.koliDisBarkodNo = params.get("outerBarcode") ?? (scannedField === "koliDisBarkodNo" ? params.get("barcode") : null) ?? "";
      setProduct(initial);
      setError("");
      return () => {
        ignore = true;
      };
    }
    if (!barcode) {
      setError("Ürün barkodu belirtilmedi.");
      return () => {
        ignore = true;
      };
    }
    setProduct(null);
    setError("");
    apiClient
      .getByBarcode(barcode)
      .then((res) => {
        if (!ignore) {
          const loaded = { ...res.data.data };
          const scannedInner = params.get("innerBarcode") ?? "";
          const scannedOuter = params.get("outerBarcode") ?? "";
          if (!loaded.barkodNo && scannedInner) loaded.barkodNo = scannedInner;
          if (!loaded.koliDisBarkodNo && scannedOuter) loaded.koliDisBarkodNo = scannedOuter;
          setProduct(loaded);
        }
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [mode, barcode, params]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!product) return <p>Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      {returnTo === "/inventory" && (
        <button type="button" onClick={() => navigate(returnTo)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          ← Kontrol ekranına dön
        </button>
      )}
      <h1 className="text-2xl font-bold text-navy-dark">
        {mode === "create" ? "Yeni Ürün" : "Ürünü Düzenle"}
      </h1>
      <ProductForm
        mode={mode}
        initial={product}
        onSaved={(saved) => navigate(returnTo === "/inventory" ? returnTo : `/products/${encodeURIComponent(saved.barkodNo)}`, { replace: returnTo === "/inventory" })}
      />
    </div>
  );
}
