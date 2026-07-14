import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, PackagePlus, Plus, Save, Star, Upload, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../../api";
import ToastAlert from "../../components/ToastAlert";
import AdminSectionShell from "../components/AdminSectionShell";
import {
  buttonClass,
  emptyProduct,
  formatFieldMessages,
  getApiErrorMessage,
  inputClass,
  secondaryButtonClass,
} from "../catalogUi";

const ProductFormPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(productId);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const imagePreviewsRef = useRef([]);
  const fileInputRef = useRef(null);

  const mainCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !category.parent &&
          (category.active ||
            String(category.id) === String(selectedMainCategory) ||
            String(category.id) === String(form.category)),
      ),
    [categories, form.category, selectedMainCategory],
  );

  const subCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          String(category.parent) === String(selectedMainCategory) &&
          (category.active || String(category.id) === String(form.category)),
      ),
    [categories, form.category, selectedMainCategory],
  );

  const loadFormData = useCallback(async () => {
    setLoading(true);
    setToast(null);

    try {
      const categoryRequest = api.get("/api/admin/categories/");
      const productRequest = isEditing ? api.get(`/api/admin/products/${productId}/`) : null;
      const [categoryResponse, productResponse] = await Promise.all([
        categoryRequest,
        productRequest,
      ]);

      setCategories(categoryResponse.data);

      if (productResponse) {
        const product = productResponse.data;
        const mainCategory = product.category_parent || product.category;
        setSelectedMainCategory(String(mainCategory));
        setForm({
          code: product.code || "",
          name: product.name,
          category: product.category,
          description: product.description || "",
          price: product.price,
          stock_balance: product.stock_balance,
          image: product.image || "",
          active: product.active,
        });
        setImagePreviews(
          (product.images?.length ? product.images : product.image ? [product.image] : []).map(
            (url, index) => ({
              id: `existing-${index}-${url}`,
              url,
              name: `Image ${index + 1}`,
              existing: true,
            }),
          ),
        );
      }
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.status === 403
            ? "Only admin users can manage products."
            : "Unable to load this product form right now.",
      });
    } finally {
      setLoading(false);
    }
  }, [isEditing, productId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    imagePreviewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((preview) => {
        if (!preview.existing) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    imagePreviews.forEach((preview) => {
      if (!preview.existing) {
        URL.revokeObjectURL(preview.url);
      }
    });

    setImageFiles(files);
    setImagePreviews(
      files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        url: URL.createObjectURL(file),
        name: file.name,
        existing: false,
      })),
    );
  };

  const clearSelectedImages = () => {
    imagePreviews.forEach((preview) => {
      if (!preview.existing) {
        URL.revokeObjectURL(preview.url);
      }
    });
    setImageFiles([]);
    setImagePreviews([]);
    setForm((current) => ({ ...current, image: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const makeImageMain = (selectedIndex) => {
    if (selectedIndex === 0) return;

    setImagePreviews((current) => {
      const selectedPreview = current[selectedIndex];
      if (!selectedPreview) return current;

      return [
        selectedPreview,
        ...current.filter((_, index) => index !== selectedIndex),
      ];
    });

    setImageFiles((current) => {
      const selectedFile = current[selectedIndex];
      if (!selectedFile) return current;

      return [
        selectedFile,
        ...current.filter((_, index) => index !== selectedIndex),
      ];
    });
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setToast(null);

    const errors = {};
    const selectedCategory = form.category || selectedMainCategory;

    if (!form.name.trim()) {
      errors.name = "Please enter a product name.";
    }

    if (!form.code.trim()) {
      errors.code = "Please enter a product code.";
    }

    if (!selectedMainCategory) {
      errors.category = "Please select a main category.";
    }

    if (form.price === "" || Number(form.price) < 0) {
      errors.price = "Please enter a valid price.";
    }

    if (form.stock_balance === "" || Number(form.stock_balance) < 0) {
      errors.stock_balance = "Please enter a valid stock balance.";
    }

    if (Object.keys(errors).length) {
      setToast({
        type: "error",
        title: "Check product details",
        message: formatFieldMessages(errors),
      });
      return;
    }

    setSaving(true);

    const payload = new FormData();
    payload.append("code", form.code.trim());
    payload.append("name", form.name);
    payload.append("category", selectedCategory);
    payload.append("description", form.description);
    payload.append("price", Number(form.price || 0).toFixed(2));
    payload.append("stock_balance", Number(form.stock_balance || 0));
    payload.append("active", form.active ? "true" : "false");
    payload.append("image", imagePreviews[0]?.url || form.image || "");
    imageFiles.forEach((file) => payload.append("images", file));

    try {
      if (isEditing) {
        await api.patch(`/api/admin/products/${productId}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/api/admin/products/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/admin/inventory/products", {
        state: {
          toast: {
            type: "success",
            message: isEditing ? "Product updated successfully." : "Product added successfully.",
          },
        },
      });
    } catch (err) {
      setToast({
        type: "error",
        message: getApiErrorMessage(err, "Unable to save product."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSectionShell
      eyebrow="Inventory"
      title={isEditing ? "Edit product" : "Add product"}
      description="Maintain product details, category, pricing, stock, image path, and storefront status from a focused product form."
      action={
        <Link className={secondaryButtonClass} to="/admin/inventory/products">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Product Listing
        </Link>
      }
    >
      <ToastAlert toast={toast} onClose={() => setToast(null)} />

      <section className="border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(28,25,23,0.06)]">
        {loading ? (
          <div className="text-sm text-stone-500">Loading product form...</div>
        ) : (
          <form onSubmit={saveProduct} noValidate className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Product code</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Product name</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Main category</span>
                <select
                  className={`${inputClass} mt-2`}
                  value={selectedMainCategory}
                  onChange={(event) => {
                    setSelectedMainCategory(event.target.value);
                    setForm((current) => ({ ...current, category: "" }));
                  }}
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Sub category</span>
                <select
                  className={`${inputClass} mt-2`}
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  disabled={!selectedMainCategory || subCategories.length === 0}
                >
                  <option value="">
                    {subCategories.length ? "Use main category" : "No sub categories"}
                  </option>
                  {subCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Price</span>
                <input
                  className={`${inputClass} mt-2`}
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Stock balance</span>
                <input
                  className={`${inputClass} mt-2`}
                  min="0"
                  step="1"
                  type="number"
                  value={form.stock_balance}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stock_balance: event.target.value }))
                  }
                />
              </label>
              <div className="block md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Product images</span>
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={handleImageSelection}
                  type="file"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.8} />
                    Select Images
                  </button>
                  {imagePreviews.length ? (
                    <button className={secondaryButtonClass} type="button" onClick={clearSelectedImages}>
                      <X className="h-4 w-4" strokeWidth={1.8} />
                      Clear
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  You can select multiple images. The first image is used as the main product image.
                </p>
              </div>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Description</span>
                <textarea
                  className={`${inputClass} mt-2 min-h-36 resize-y`}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                Active
              </label>
            </div>

            <aside className="border border-stone-200 bg-stone-50 p-4">
              <div className="flex aspect-square items-center justify-center border border-stone-200 bg-white text-stone-400">
                {imagePreviews[0]?.url ? (
                  <img alt="" className="h-full w-full object-cover" src={imagePreviews[0].url} />
                ) : (
                  <ImageIcon className="h-10 w-10" strokeWidth={1.6} />
                )}
              </div>
              {imagePreviews.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={preview.id}
                      className="relative aspect-square overflow-hidden border border-stone-200 bg-white"
                      title={preview.name}
                    >
                      <img alt="" className="h-full w-full object-cover" src={preview.url} />
                      {index === 0 ? (
                        <span className="absolute left-1 top-1 bg-stone-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          Main
                        </span>
                      ) : (
                        <button
                          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center border border-white/70 bg-white/90 text-stone-700 shadow-sm transition hover:border-stone-950 hover:text-stone-950"
                          type="button"
                          onClick={() => makeImageMain(index)}
                          title="Set as main image"
                        >
                          <Star className="h-3.5 w-3.5" strokeWidth={2} />
                          <span className="sr-only">Set as main image</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-3">
                <PackagePlus className="h-5 w-5 text-stone-950" strokeWidth={1.8} />
                <p className="font-semibold text-stone-950">Product preview</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                The listing page will show this product with its code, image, category, price, stock, and
                active status.
              </p>
              <button className={`${buttonClass} mt-5 w-full`} type="submit" disabled={saving}>
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saving ? "Saving..." : isEditing ? "Save Product" : "Add Product"}
              </button>
            </aside>
          </form>
        )}
      </section>
    </AdminSectionShell>
  );
};

export default ProductFormPage;
