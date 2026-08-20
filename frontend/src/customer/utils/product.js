export const normalizeProduct = (product) => {
  const images = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : [];
  const category = product.category_parent_name || product.category_name || "Uncategorized";

  return {
    ...product,
    _id: String(product._id || product.id),
    basePrice: Number(product.price || 0),
    price: Number(product.price || 0),
    image: images,
    category,
    subCategory: product.category_parent_name
      ? product.category_name
      : product.subCategory || product.category_name || category,
    sizes: product.sizes?.length ? product.sizes : ["Original"],
    date: Number(product.date || Date.parse(product.created_at) || 0),
    bestseller: Boolean(product.bestseller),
  };
};
