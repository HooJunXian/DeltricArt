import React, { useContext, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../customer/context/shop-context";

const Products = () => {
  const { products, productsLoading, productsError, formatMoney, addToCart, showToast } =
    useContext(ShopContext);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [subCategory, setSubCategory] = useState(searchParams.get("type") || "All");
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(null);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products]
  );

  const subCategories = useMemo(
    () => [
      "All",
      ...new Set(
        products
          .filter((product) => category === "All" || product.category === category)
          .map((product) => product.subCategory)
      ),
    ],
    [category, products]
  );

  const highestPrice = useMemo(
    () => Math.max(0, ...products.map((product) => product.price)),
    [products]
  );
  const priceStep = highestPrice > 1000 ? 100 : 10;
  const selectedMaxPrice = maxPrice ?? highestPrice;
  const minPricePercent = highestPrice ? (minPrice / highestPrice) * 100 : 0;
  const maxPricePercent = highestPrice ? (selectedMaxPrice / highestPrice) * 100 : 100;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(normalizedSearch) ||
          (product.description || "").toLowerCase().includes(normalizedSearch) ||
          product.category.toLowerCase().includes(normalizedSearch) ||
          product.subCategory.toLowerCase().includes(normalizedSearch);
        const matchesCategory = category === "All" || product.category === category;
        const matchesSubCategory =
          subCategory === "All" || product.subCategory === subCategory;
        const matchesPrice = product.price >= minPrice && product.price <= selectedMaxPrice;

        return matchesSearch && matchesCategory && matchesSubCategory && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        if (sortBy === "category") return a.category.localeCompare(b.category);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b.date - a.date;
      });
  }, [category, minPrice, products, searchTerm, selectedMaxPrice, sortBy, subCategory]);

  const resetFilters = () => {
    setSearchTerm("");
    setCategory("All");
    setSubCategory("All");
    setSortBy("newest");
    setMinPrice(0);
    setMaxPrice(null);
  };

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              All Products
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              Browse All Products
            </h1>
            <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
              Search original works, filter by medium, and sort the full studio
              catalogue by price, category, name, or newest arrival.
            </p>
          </div>

          <div className="flex min-w-[180px] flex-col gap-1 rounded-lg border border-stone-200 bg-white px-5 py-4 text-stone-900 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <span className="text-3xl font-semibold">{filteredProducts.length}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Works Found
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-900">
                Sort & Filter
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="border-b border-stone-400 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
              >
                Reset
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Search</span>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-3 focus-within:border-stone-900">
                  <img src={assets.search_icon} alt="" className="h-4 w-4 opacity-60" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by title, type..."
                    className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
                >
                  <option value="newest">Newest arrivals</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="category">Category</option>
                  <option value="name">Name</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Category</span>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setSubCategory("All");
                  }}
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Type</span>
                <select
                  value={subCategory}
                  onChange={(event) => setSubCategory(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
                >
                  {subCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-stone-700">
                  Price range
                  <span className="text-right font-semibold text-stone-950">
                    {formatMoney(minPrice)} - {formatMoney(selectedMaxPrice)}
                  </span>
                </span>
                <div className="relative mt-5 h-8">
                  <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-200" />
                  <div
                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-950"
                    style={{
                      left: `${minPricePercent}%`,
                      right: `${100 - maxPricePercent}%`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={highestPrice}
                    step={priceStep}
                    value={minPrice}
                    onChange={(event) => {
                      const nextMin = Math.min(Number(event.target.value), selectedMaxPrice);
                      setMinPrice(nextMin);
                    }}
                    className="price-range-input absolute inset-x-0 top-1/2 z-20 w-full -translate-y-1/2"
                    aria-label="Minimum price"
                  />
                  <input
                    type="range"
                    min="0"
                    max={highestPrice}
                    step={priceStep}
                    value={selectedMaxPrice}
                    onChange={(event) => {
                      const nextMax = Math.max(Number(event.target.value), minPrice);
                      setMaxPrice(nextMax);
                    }}
                    className="price-range-input absolute inset-x-0 top-1/2 z-30 w-full -translate-y-1/2"
                    aria-label="Maximum price"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-medium text-stone-500">
                  <span>{formatMoney(0)}</span>
                  <span>{formatMoney(highestPrice)}</span>
                </div>
              </div>
            </div>
          </aside>

          <section>
            {productsLoading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-stone-200 bg-white px-6 text-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Loading products...
              </div>
            ) : productsError ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 text-center text-sm leading-7 text-stone-600">
                {productsError}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Link
                    key={product._id}
                    to={`/product/${product._id}`}
                    className="group block"
                  >
                    <article className="h-full overflow-hidden rounded-lg bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1">
                      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                        <img
                          src={product.image[0] || assets.oilpainting_1}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        {product.bestseller && (
                          <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-900 shadow-sm">
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="flex h-[190px] flex-col px-3 py-4 sm:h-[210px] sm:px-5 sm:py-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400 sm:text-xs sm:tracking-[0.28em]">
                          {product.category}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-stone-900 sm:text-lg">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-stone-500 sm:text-sm">
                          {product.subCategory}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600 sm:mt-3 sm:text-sm sm:leading-6">
                          {product.description || "Product details will be updated soon."}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3 sm:gap-4 sm:pt-4">
                          <span className="text-sm font-semibold text-stone-950 sm:text-base">
                            {formatMoney(product.price)}
                          </span>
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const added = await addToCart(product._id);
                              if (added) {
                                showToast({
                                  type: "success",
                                  title: "Added to cart",
                                  message: `${product.name} has been added to your cart.`,
                                });
                              }
                            }}
                            className="bg-stone-950 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-rose-800 sm:px-3 sm:text-xs sm:tracking-[0.12em]"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 text-center">
                <h2 className="prata-regular text-3xl text-stone-950">
                  No works found
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-stone-600">
                  Try widening your price range, changing category, or searching
                  with a simpler title or medium.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 rounded-lg bg-stone-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default Products;
