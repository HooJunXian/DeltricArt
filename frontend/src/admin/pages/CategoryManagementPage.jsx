import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Eye, EyeOff, Plus, RefreshCw, Save, Search, Tags, Trash2, X } from "lucide-react";

import api from "../../api";
import ToastAlert from "../../components/ToastAlert";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminTable from "../components/AdminTable";
import {
  actionIconProps,
  buttonClass,
  dangerIconButtonClass,
  emptyCategory,
  formatFieldMessages,
  getApiErrorMessage,
  iconButtonClass,
  inputClass,
  secondaryButtonClass,
} from "../catalogUi";
import { formatDate } from "../utils";

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyCategory);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");

  const mainCategories = useMemo(
    () =>
      categories.filter(
        (category) => !category.parent && (!editingId || category.id !== editingId),
      ),
    [categories, editingId],
  );

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) => {
      const searchable = [
        category.name,
        category.parent_name,
        category.description,
        category.category_type,
        category.active ? "shown active show" : "hidden inactive hide",
        String(category.product_count ?? 0),
        String(category.child_count ?? 0),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [categories, categorySearch]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setToast(null);

    try {
      const response = await api.get("/api/admin/categories/");
      setCategories(response.data);
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.status === 403
            ? "Only admin users can manage categories."
            : "Unable to load categories right now.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setForm(emptyCategory);
    setEditingId(null);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setToast(null);

    const errors = {};
    if (!form.name.trim()) {
      errors.name = "Please enter a category name.";
    }

    if (Object.keys(errors).length) {
      setToast({
        type: "error",
        title: "Check category details",
        message: formatFieldMessages(errors),
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        parent: form.parent || null,
      };

      if (editingId) {
        await api.patch(`/api/admin/categories/${editingId}/`, payload);
      } else {
        await api.post("/api/admin/categories/", payload);
      }

      resetForm();
      await loadCategories();
      setToast({
        type: "success",
        message: editingId ? "Category updated successfully." : "Category added successfully.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: getApiErrorMessage(err, "Unable to save category."),
      });
    } finally {
      setSaving(false);
    }
  };

  const editCategory = useCallback((category) => {
    setEditingId(category.id);
    setForm({
      parent: category.parent || "",
      name: category.name,
      description: category.description || "",
      active: category.active,
    });
  }, []);

  const toggleCategoryVisibility = useCallback(async (category) => {
    setToast(null);
    try {
      await api.patch(`/api/admin/categories/${category.id}/`, {
        active: !category.active,
      });
      await loadCategories();
      setToast({
        type: "success",
        message: category.active ? "Category hidden successfully." : "Category shown successfully.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: getApiErrorMessage(err, "Unable to update category status."),
      });
    }
  }, [loadCategories]);

  const deleteCategory = useCallback(async (category) => {
    setToast(null);

    const confirmed = window.confirm(`Delete "${category.name}" permanently?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/api/admin/categories/${category.id}/`);
      await loadCategories();
      setToast({
        type: "success",
        message: "Category deleted successfully.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: getApiErrorMessage(err, "Unable to delete category."),
      });
    }
  }, [loadCategories]);

  const categoryColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        headerClassName: "px-2 py-3",
        cellClassName: "px-2 py-3",
        sortValue: (category) => category.name,
        render: (category) => (
          <>
            <p className="font-semibold text-stone-950">{category.name}</p>
            {category.parent_name ? (
              <p className="mt-1 text-xs font-medium text-stone-500">
                Under {category.parent_name}
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-xs text-stone-500">
              {category.description || "No description"}
            </p>
          </>
        ),
      },
      {
        key: "category_type",
        label: "Level",
        headerClassName: "px-2 py-3",
        cellClassName: "whitespace-nowrap px-2 py-3",
      },
      {
        key: "active",
        label: "Status",
        headerClassName: "px-2 py-3",
        cellClassName: "whitespace-nowrap px-2 py-3",
        sortValue: (category) => (category.active ? "Shown" : "Hidden"),
        render: (category) => (category.active ? "Shown" : "Hidden"),
      },
      {
        key: "product_count",
        label: "Products",
        headerClassName: "px-2 py-3",
        cellClassName: "px-2 py-3",
      },
      {
        key: "child_count",
        label: "Subs",
        headerClassName: "px-2 py-3",
        cellClassName: "px-2 py-3",
      },
      {
        key: "created_at",
        label: "Created",
        headerClassName: "hidden px-2 py-3 2xl:table-cell",
        cellClassName: "hidden whitespace-nowrap px-2 py-3 2xl:table-cell",
        sortValue: (category) => category.created_at,
        render: (category) => formatDate(category.created_at),
      },
      {
        key: "updated_at",
        label: "Updated",
        headerClassName: "px-2 py-3",
        cellClassName: "whitespace-nowrap px-2 py-3",
        sortValue: (category) => category.updated_at,
        render: (category) => formatDate(category.updated_at),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        align: "right",
        headerClassName: "px-2 py-3 text-right",
        cellClassName: "px-2 py-3",
        render: (category) => (
          <div className="flex justify-end gap-1">
            <button
              className={iconButtonClass}
              type="button"
              onClick={() => editCategory(category)}
              title="Edit category"
            >
              <Edit3 {...actionIconProps} />
              <span className="sr-only">Edit</span>
            </button>
            <button
              className={iconButtonClass}
              type="button"
              onClick={() => toggleCategoryVisibility(category)}
              title={category.active ? "Hide category" : "Show category"}
            >
              {category.active ? (
                <EyeOff {...actionIconProps} />
              ) : (
                <Eye {...actionIconProps} />
              )}
              <span className="sr-only">{category.active ? "Hide" : "Show"}</span>
            </button>
            <button
              className={dangerIconButtonClass}
              type="button"
              onClick={() => deleteCategory(category)}
              title="Delete category"
            >
              <Trash2 {...actionIconProps} />
              <span className="sr-only">Delete</span>
            </button>
          </div>
        ),
      },
    ],
    [deleteCategory, editCategory, toggleCategoryVisibility],
  );

  return (
    <AdminSectionShell
      eyebrow="Catalog"
      title="Categories"
      description="Create main categories and sub categories, update descriptions, show or hide categories, and permanently delete safe categories."
      action={
        <button className={secondaryButtonClass} type="button" onClick={loadCategories}>
          <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
          Refresh
        </button>
      }
    >
      <ToastAlert toast={toast} onClose={() => setToast(null)} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="min-w-0 border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(28,25,23,0.06)] md:p-5">
          <div className="flex items-center gap-3">
            <Tags className="h-5 w-5 text-stone-950" strokeWidth={1.8} />
            <h2 className="text-xl font-semibold text-stone-950">
              {editingId ? "Edit category" : "Add category"}
            </h2>
          </div>

          <form onSubmit={saveCategory} noValidate className="mt-5 grid gap-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Category level</span>
              <select
                className={`${inputClass} mt-2`}
                value={form.parent}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parent: event.target.value }))
                }
              >
                <option value="">Main category</option>
                {mainCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    Sub category under {category.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              className={inputClass}
              placeholder="Category name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <textarea
              className={`${inputClass} min-h-32 resize-y`}
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
            <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Show in storefront
            </label>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="submit" disabled={saving}>
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Save Category" : "Add Category"}
              </button>
              {editingId ? (
                <button className={secondaryButtonClass} type="button" onClick={resetForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="min-w-0 border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(28,25,23,0.06)] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-stone-950">Category listing</h2>
            <label className="relative block w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Search categories"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-5">
            <AdminTable
              columns={categoryColumns}
              rows={filteredCategories}
              loading={loading}
              loadingText="Loading categories..."
              emptyText={
                categorySearch.trim()
                  ? "No categories match your search."
                  : "No categories yet."
              }
              minWidth="760px"
              getRowKey={(category) => category.id}
            />
          </div>
        </section>
      </div>
    </AdminSectionShell>
  );
};

export default CategoryManagementPage;
