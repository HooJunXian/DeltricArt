import React, { useContext, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ImagePlus, Search } from "lucide-react";
import { assets } from "../../assets/assets";
import { ShopContext } from "../context/shop-context";

const formatDimensions = (product) => {
  const dimensions = [
    product.width_cm ? `W ${Number(product.width_cm).toFixed(2)} cm` : "",
    product.height_cm ? `H ${Number(product.height_cm).toFixed(2)} cm` : "",
    product.length_cm ? `L ${Number(product.length_cm).toFixed(2)} cm` : "",
  ].filter(Boolean);

  return dimensions.length ? dimensions.join(" x ") : "Contact us";
};

const Product = () => {
  const { productId } = useParams();
  const { products, productsLoading, formatMoney, delivery_fee, addToCart, showToast } =
    useContext(ShopContext);
  const product = products.find((item) => item._id === productId);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 50, y: 50 });

  const relatedProducts = useMemo(() => {
    if (!product) return [];

    return products
      .filter(
        (item) =>
          item._id !== product._id &&
          (item.category === product.category ||
            item.subCategory === product.subCategory)
      )
      .slice(0, 3);
  }, [product, products]);

  if (productsLoading) {
    return (
      <main className="mx-auto flex min-h-[520px] max-w-3xl items-center justify-center px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500">
          Loading product...
        </p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
          Product Not Found
        </p>
        <h1 className="prata-regular mt-4 text-4xl text-stone-950 sm:text-5xl">
          This piece is no longer available
        </h1>
        <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">
          The product link may be outdated, or the work may have been removed
          from the studio catalogue.
        </p>
        <Link
          to="/products"
          className="mt-8 rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
        >
          View Products
        </Link>
      </main>
    );
  }

  const activeImage = product.image[selectedImage] || product.image[0] || assets.oilpainting_1;
  const hasMultipleImages = product.image.length > 1;
  const supportsRoomPreview = Boolean(
    activeImage && Number(product.width_cm) > 0 && Number(product.height_cm) > 0
  );

  const handleMagnifierMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setMagnifierPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <Link to="/" className="transition hover:text-stone-950">
            Home
          </Link>
          <span>/</span>
          <Link to="/products" className="transition hover:text-stone-950">
            Products
          </Link>
          <span>/</span>
          <span className="text-stone-950">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
          <div
            className={
              hasMultipleImages
                ? "grid gap-4 sm:grid-cols-[88px_1fr]"
                : "grid gap-4"
            }
          >
            {hasMultipleImages && (
              <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
                {product.image.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border bg-stone-100 transition ${
                      selectedImage === index
                        ? "border-stone-950"
                        : "border-stone-200 hover:border-stone-500"
                    }`}
                    aria-label={`Show ${product.name} image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div
              className={`relative order-1 flex min-h-[420px] items-center justify-center overflow-hidden rounded-lg bg-stone-100 p-5 sm:min-h-[620px] ${
                hasMultipleImages ? "sm:order-2" : ""
              }`}
              onMouseEnter={() => setIsMagnifying(true)}
              onMouseLeave={() => setIsMagnifying(false)}
              onMouseMove={handleMagnifierMove}
            >
              <img
                src={activeImage}
                alt={product.name}
                className="h-full max-h-[720px] w-full object-contain"
              />
              <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 shadow-sm backdrop-blur">
                <Search className="h-4 w-4" strokeWidth={1.8} />
                Hover to zoom
              </div>
              {isMagnifying && (
                <div
                  className="pointer-events-none absolute hidden h-44 w-44 rounded-full border-4 border-white bg-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] lg:block"
                  style={{
                    left: `${magnifierPosition.x}%`,
                    top: `${magnifierPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundImage: `url(${activeImage})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "230%",
                    backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                  }}
                />
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:h-fit">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              {product.subCategory}
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl lg:text-6xl">
              {product.name}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-semibold text-stone-950">
                {formatMoney(product.price)}
              </span>
              {product.bestseller && (
                <span className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                  Featured Work
                </span>
              )}
            </div>

            <p className="mt-7 text-base leading-8 text-stone-600">
              {product.description || "Product details will be updated soon."}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Category
                </p>
                <p className="mt-2 font-semibold text-stone-950">
                  {product.category}
                </p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Dimensions
                </p>
                <p className="mt-2 font-semibold text-stone-950">
                  {formatDimensions(product)}
                </p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Delivery
                </p>
                <p className="mt-2 font-semibold text-stone-950">
                  From {formatMoney(delivery_fee)}
                </p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Availability
                </p>
                <p className="mt-2 font-semibold text-stone-950">
                  Enquiry Ready
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  const added = await addToCart(product._id);
                  if (added) {
                    showToast({
                      type: "success",
                      title: "Added to cart",
                      message: `${product.name} has been added to your cart.`,
                    });
                  }
                }}
                className="flex min-h-12 items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
              >
                Add To Cart
              </button>
              {supportsRoomPreview ? (
                <Link
                  to={`/room-customizer?product=${product._id}`}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-950 transition hover:bg-stone-100"
                >
                  <ImagePlus className="h-4 w-4" />
                  View In My Room
                </Link>
              ) : null}
            </div>

            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Product Notes
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                <li>Original studio-selected artwork for interior display.</li>
                <li>Handled with protective packing before delivery.</li>
                <li>Contact the studio for viewing, framing, and placement advice.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl border-t border-stone-200 pt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500">
                Related Products
              </p>
              <h2 className="prata-regular mt-3 text-4xl text-stone-950">
                You May Also Like
              </h2>
            </div>
            <Link
              to="/products"
              className="w-fit border-b border-stone-400 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
            >
              View All Products
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link key={item._id} to={`/product/${item._id}`} className="group block">
                <article className="overflow-hidden rounded-lg bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1">
                  <div className="aspect-[4/5] overflow-hidden bg-stone-100">
                    <img
                      src={item.image[0] || assets.oilpainting_1}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                      {item.category}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-stone-900">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm text-stone-500">
                      {formatMoney(item.price)}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default Product;

