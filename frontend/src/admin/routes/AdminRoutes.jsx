import React from "react";
import { Navigate, Route } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";
import CategoryManagementPage from "../pages/CategoryManagementPage";
import CompanySettingsPage from "../pages/CompanySettingsPage";
import CustomersPage from "../pages/CustomersPage";
import ProductFormPage from "../pages/ProductFormPage";
import ProductListingPage from "../pages/ProductListingPage";
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
      <Route path="inventory" element={<Navigate replace to="/admin/catalog/products" />} />
      <Route path="catalog" element={<Navigate replace to="/admin/catalog/products" />} />
      <Route path="catalog/categories" element={<CategoryManagementPage />} />
      <Route path="catalog/products" element={<ProductListingPage />} />
      <Route path="catalog/products/new" element={<ProductFormPage />} />
      <Route path="catalog/products/:productId/edit" element={<ProductFormPage />} />
      <Route path="inventory/categories" element={<CategoryManagementPage />} />
      <Route path="inventory/products" element={<ProductListingPage />} />
      <Route path="inventory/products/new" element={<ProductFormPage />} />
      <Route path="inventory/products/:productId/edit" element={<ProductFormPage />} />
      <Route path="orders" element={<SalesOfficePage />} />
      <Route path="sales-office" element={<Navigate replace to="/admin/orders" />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="reports" element={<Navigate replace to="/admin" />} />
      <Route path="settings/access" element={<SetupPage />} />
      <Route path="settings/company" element={<CompanySettingsPage />} />
      <Route path="setup" element={<SetupPage />} />
      <Route path="company" element={<CompanySettingsPage />} />
      <Route path="setup/company" element={<CompanySettingsPage />} />
    </Route>
  </>
);

export default AdminRoutes;
