import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RootLayout } from "./components/layout/RootLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
const BookDetails = lazy(() => import("./pages/BookDetails"));
const Categories = lazy(() => import("./pages/Categories"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminAddBook = lazy(() => import("./pages/admin/AddBook"));
const AdminPrintLabels = lazy(() => import("./pages/admin/PrintLabels"));
const CatalogImporter = lazy(() => import("./pages/admin/CatalogImporter"));
const BulkImport = lazy(() => import("./pages/admin/BulkImport"));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-serif">Carregando...</div>}>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="browse" element={<Browse />} />
          <Route path="book/:id" element={<BookDetails />} />
          <Route path="categories" element={<Categories />} />
        </Route>
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="add-book" element={<AdminAddBook />} />
          <Route path="print-labels" element={<AdminPrintLabels />} />
          <Route path="import" element={<CatalogImporter />} />
          <Route path="bulk-import" element={<BulkImport />} />
        </Route>
      </Routes>
      </Suspense>
    </Router>
  );
}
