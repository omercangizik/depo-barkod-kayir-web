import axios, { AxiosError } from "axios";
import type {
  Categories,
  ImportReport,
  PaginatedProducts,
  Product,
  ProductField,
  ProductStats,
} from "../types/product";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  withCredentials: true,
});

api.interceptors.response.use(undefined, (error: unknown) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    !String(error.config?.url ?? "").startsWith("/auth/")
  ) {
    window.dispatchEvent(new Event("depo:session-expired"));
  }
  return Promise.reject(error);
});

export function getErrorMessage(err: unknown): string {
  if (!navigator.onLine) return "İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.";
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ error?: { message?: string } }>;
    if (!ax.response) return "Sunucuya bağlanılamadı. Backend çalışıyor mu?";
    return ax.response.data?.error?.message ?? "İşlem başarısız oldu.";
  }
  if (err instanceof Error) return err.message;
  return "Beklenmeyen bir hata oluştu.";
}

export const apiClient = {
  login: (password: string) => api.post("/auth/login", { password }),
  session: () => api.get<{ success: boolean; data: { authenticated: boolean } }>("/auth/session"),
  logout: () => api.post("/auth/logout"),
  health: () => api.get("/health"),
  stats: () => api.get<{ success: boolean; data: ProductStats }>("/products/stats"),
  products: (params: Record<string, string | number | boolean>) =>
    api.get<{ success: boolean; data: PaginatedProducts }>("/products", { params }),
  getByBarcode: (barcode: string) =>
    api.get<{ success: boolean; data: Product }>(`/products/barcode/${encodeURIComponent(barcode)}`),
  createProduct: (body: Product) => api.post<{ success: boolean; data: Product }>("/products", body),
  updateProduct: (barcode: string, updates: Record<string, string>, clearFields: string[]) =>
    api.put<{ success: boolean; data: Product }>(`/products/barcode/${encodeURIComponent(barcode)}`, {
      updates,
      clearFields,
    }),
  categories: () => api.get<{ success: boolean; data: Categories }>("/categories"),
  addSubcategory: (anaKategori: string, altKategori: string) =>
    api.post("/categories", { anaKategori, altKategori }),
  previewImport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{
      success: boolean;
      data: {
        headers: string[];
        suggestedMapping: Partial<Record<ProductField, number>>;
        preview: string[][];
        totalRows: number;
        headerRow: number;
        fields: ProductField[];
      };
    }>("/products/import/preview", form);
  },
  importFile: (file: File, mapping: Partial<Record<ProductField, number>>) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    return api.post<{ success: boolean; data: ImportReport }>("/products/import", form);
  },
  exportFile: async () => {
    const res = await api.get("/products/export", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ambalaj_deposu_urun_listesi.xlsx";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
