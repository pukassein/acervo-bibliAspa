import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import BookDetails from "./pages/BookDetails";
import Categories from "./pages/Categories";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAddBook from "./pages/admin/AddBook";
import AdminPrintLabels from "./pages/admin/PrintLabels";
import CatalogImporter from "./pages/admin/CatalogImporter";
import BulkImport from "./pages/admin/BulkImport";

export default function App() {
  return (
    <Router>
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
    </Router>
  );
}
