import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MenuPasswordGate } from "./components/MenuPasswordGate";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExportPage } from "./pages/ExportPage";
import { ImportPage } from "./pages/ImportPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductListPage } from "./pages/ProductListPage";
import { ScanPage } from "./pages/ScanPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductFormPage mode="create" />} />
        <Route path="/products/:barcode" element={<ProductFormPage mode="edit" />} />
        <Route path="/import" element={<MenuPasswordGate title="Aktar"><ImportPage /></MenuPasswordGate>} />
        <Route path="/export" element={<MenuPasswordGate title="Excel"><ExportPage /></MenuPasswordGate>} />
        <Route path="/categories" element={<MenuPasswordGate title="Kategori"><CategoriesPage /></MenuPasswordGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
