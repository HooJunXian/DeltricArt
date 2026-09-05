import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  RotateCcw,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../../api";
import ToastAlert from "../../components/ToastAlert";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminTable from "../components/AdminTable";
import {
  actionIconProps,
  buttonClass,
  getApiErrorMessage,
  iconButtonClass,
  inputClass,
  secondaryButtonClass,
  statusOptions,
} from "../catalogUi";
import { formatCurrency, formatDate } from "../utils";

const defaultFilters = {
  search: "",
  mainCategory: "",
  subCategory: "",
  active: "",
};

const formatDimensions = (product) => {
  const dimensions = [
    product.width_cm ? `W ${Number(product.width_cm).toFixed(2)} cm` : "",
    product.height_cm ? `H ${Number(product.height_cm).toFixed(2)} cm` : "",
    product.length_cm ? `L ${Number(product.length_cm).toFixed(2)} cm` : "",
  ].filter(Boolean);

  return dimensions.length ? dimensions.join(" x ") : "-";
};

const ProductListingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [tableResetKey, setTableResetKey] = useState(0);

  const loadProducts = useCallback(async (productFilters = defaultFilters) => {
    setLoading(true);
    setToast(null);

    try {
      const params = new URLSearchParams();
      if (productFilters.search.trim()) params.set("search", productFilters.search.trim());
      if (productFilters.subCategory || productFilters.mainCategory) {
        params.set("category", productFilters.subCategory || productFilters.mainCategory);
      }
      if (productFilters.active) params.set("active", productFilters.active);

      const [categoryResponse, productResponse] = await Promise.all([
        api.get("/api/admin/categories/"),
        api.get(`/api/admin/products/${params.toString() ? `?${params}` : ""}`),
      ]);

      setCategories(categoryResponse.data);
      setProducts(productResponse.data);
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.status === 403
            ? "Only admin users can view products."
            : "Unable to load products right now.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const mainCategories = useMemo(
    () => categories.filter((category) => !category.parent),
    [categories],
  );

  const subCategories = useMemo(
    () =>
      categories.filter(
        (category) => String(category.parent) === String(filters.mainCategory),
      ),
    [categories, filters.mainCategory],
  );

  useEffect(() => {
    loadProducts(filters);
  }, [filters, loadProducts]);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const resetProductView = () => {
    setFilters(defaultFilters);
    setTableResetKey((current) => current + 1);
  };

  const deactivateProduct = useCallback(async (product) => {
    setToast(null);
    try {
      await api.delete(`/api/admin/products/${product.id}/`);
      await loadProducts(filters);
      setToast({
        type: "success",
        message: "Product hidden successfully.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: getApiErrorMessage(err, "Unable to hide product."),
      });
    }
  }, [filters, loadProducts]);

  const productColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Product",
        sortValue: (product) => product.name,
        render: (product) => (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-stone-200 bg-stone-50 text-stone-400">
              {product.image ? (
                <img alt="" className="h-full w-full object-cover" src={product.image} />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-stone-950">{product.name}</p>
              <p className="mt-1 line-clamp-1 max-w-xs text-xs text-stone-500">
                {product.description}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "code",
        label: "Code",
        sortValue: (product) => product.code || "",
        render: (product) => product.code || "-",
      },
      {
        key: "category",
        label: "Category",
        sortValue: (product) => product.category_path || product.category_name,
        render: (product) => product.category_path || product.category_name,
      },
      {
        key: "price",
        label: "Price",
        sortValue: (product) => Number(product.price || 0),
        render: (product) => formatCurrency(product.price),
      },
      {
        key: "stock_balance",
        label: "Stock Balance",
        sortValue: (product) => Number(product.stock_balance || 0),
      },
      {
        key: "dimensions",
        label: "Dimensions",
        sortValue: (product) =>
          [product.width_cm, product.height_cm, product.length_cm]
            .map((value) => Number(value || 0).toFixed(2))
            .join("-"),
        render: formatDimensions,
      },
      {
        key: "active",
        label: "Status",
        sortValue: (product) => (product.active ? "Active" : "Inactive"),
        render: (product) => (product.active ? "Active" : "Inactive"),
      },
      {
        key: "created_at",
        label: "Created",
        sortValue: (product) => product.created_at,
        render: (product) => formatDate(product.created_at),
      },
      {
        key: "updated_at",
        label: "Updated",
        sortValue: (product) => product.updated_at,
        render: (product) => formatDate(product.updated_at),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        align: "right",
        headerClassName: "px-3 py-3 text-right",
        render: (product) => (
          <div className="flex justify-end gap-1">
            <Link
              className={iconButtonClass}
              to={`/admin/inventory/products/${product.id}/edit`}
              title="Edit product"
            >
              <Edit3 {...actionIconProps} />
              <span className="sr-only">Edit product</span>
            </Link>
            <button
              className={iconButtonClass}
              type="button"
              onClick={() => deactivateProduct(product)}
              disabled={!product.active}
              title="Hide product"
            >
              <EyeOff {...actionIconProps} />
              <span className="sr-only">Hide product</span>
            </button>
          </div>
        ),
      },
    ],
    [deactivateProduct],
  );

  return (
    <AdminSectionShell
      eyebrow="Inventory"
      title="Products listing"
      description="Search and filter products by name, category, and active status. Use this page for review work, then jump into a focused edit form when needed."
      action={
        <div className="flex flex-wrap gap-2">
          <button className={secondaryButtonClass} type="button" onClick={() => loadProducts(filters)}>
            <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
            Refresh
          </button>
          <Link className={buttonClass} to="/admin/inventory/products/new">
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Add Product
          </Link>
        </div>
      }
    >
      <ToastAlert toast={toast} onClose={() => setToast(null)} />

      <section className="border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(28,25,23,0.06)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search by product code or name"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
            />
          </label>
          <select
            className={inputClass}
            value={filters.mainCategory}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                mainCategory: event.target.value,
                subCategory: "",
              }));
            }}
          >
            <option value="">All main categories</option>
            {mainCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.subCategory}
            onChange={(event) =>
              setFilters((current) => ({ ...current, subCategory: event.target.value }))
            }
            disabled={!filters.mainCategory || subCategories.length === 0}
          >
            <option value="">
              {filters.mainCategory && subCategories.length ? "All sub categories" : "No sub category"}
            </option>
            {subCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.active}
            onChange={(event) =>
              setFilters((current) => ({ ...current, active: event.target.value }))
            }
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className={secondaryButtonClass} type="button" onClick={resetProductView}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
            Reset
          </button>
        </div>

        <div className="mt-5">
          <AdminTable
            key={tableResetKey}
            columns={productColumns}
            rows={products}
            loading={loading}
            loadingText="Loading products..."
            emptyText="No products match the current filters."
            minWidth="1200px"
            getRowKey={(product) => product.id}
          />
        </div>
      </section>
    </AdminSectionShell>
  );
};

export default ProductListingPage;
