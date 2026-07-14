import React from "react";
import { Route } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";
import CategoryManagementPage from "../pages/CategoryManagementPage";
import CompanySettingsPage from "../pages/CompanySettingsPage";
import InventoryPage from "../pages/InventoryPage";
import ProductFormPage from "../pages/ProductFormPage";
import ProductListingPage from "../pages/ProductListingPage";
import ReportsPage from "../pages/ReportsPage";
import SalesOfficePage from "../pages/SalesOfficePage";
import SetupPage from "../pages/SetupPage";

const AdminRoutes = () => (
  <>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<AdminDashboard />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="inventory/categories" element={<CategoryManagementPage />} />
      <Route path="inventory/products" element={<ProductListingPage />} />
      <Route path="inventory/products/new" element={<ProductFormPage />} />
      <Route path="inventory/products/:productId/edit" element={<ProductFormPage />} />
      <Route path="sales-office" element={<SalesOfficePage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="setup" element={<SetupPage />} />
      <Route path="company" element={<CompanySettingsPage />} />
      <Route path="setup/company" element={<CompanySettingsPage />} />
    </Route>
  </>
);

export default AdminRoutes;
