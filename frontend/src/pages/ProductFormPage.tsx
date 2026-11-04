import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";
import { emptyProduct, type Product } from "../types/product";

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const { barcode } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    if (mode === "create") {
      const initial = emptyProduct();
      const scannedField = params.get("barcodeField") === "koliDisBarkodNo"
        ? "koliDisBarkodNo"
        : "barkodNo";
      initial[scannedField] = params.get("barcode") ?? "";
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
        if (!ignore) setProduct(res.data.data);
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
      <h1 className="text-2xl font-bold text-navy-dark">
        {mode === "create" ? "Yeni Ürün" : "Ürünü Düzenle"}
      </h1>
      <ProductForm
        mode={mode}
        initial={product}
        onSaved={(saved) => navigate(`/products/${encodeURIComponent(saved.barkodNo)}`)}
      />
    </div>
  );
}
