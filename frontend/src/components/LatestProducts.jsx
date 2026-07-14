import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../customer/context/shop-context";

const LatestProducts = () => {
  const { products, formatMoney } = useContext(ShopContext);

  const latestProducts = [...products]
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);

  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-stone-500">
            Fresh Picks
          </p>
          <h2 className="prata-regular mt-4 text-4xl text-stone-900 sm:text-5xl lg:text-6xl">
            Latest Products
          </h2>
          <div className="mx-auto mt-5 h-[3px] w-28 rounded-full bg-stone-900" />
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
            A curated edit of the newest arrivals, designed to keep the section
            clean, clickable, and easy to browse across every screen size.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestProducts.map((product) => (
            <Link
              key={product._id}
              to={`/product/${product._id}`}
              className="group block"
            >
              <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1">
                <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                  <img
                    src={product.image[0] || assets.oilpainting_1}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/0 transition duration-300 group-hover:bg-stone-900/35">
                    <span className="rounded-full border border-white/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white opacity-0 transition duration-300 group-hover:opacity-100">
                      View
                    </span>
                  </div>
                </div>

                <div className="space-y-2 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                    {product.category}
                  </p>
                  <h3 className="text-lg font-semibold text-stone-900">
                    {product.name}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {product.subCategory}
                  </p>
                  <p className="pt-1 text-base font-semibold text-stone-900">
                    {formatMoney(product.price)}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestProducts;
