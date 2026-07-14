import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../customer/context/shop-context";

const FeaturedWorks = () => {
  const { products, formatMoney } = useContext(ShopContext);
  const featuredWorks = products.filter((product) => product.bestseller).slice(0, 3);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-rose-700">
              Curated Edit
            </p>
            <h2 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              Featured Works
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-stone-600 sm:text-base">
            Signature pieces selected for texture, light, and presence in modern
            interiors.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {featuredWorks.map((work, index) => (
            <Link
              key={work._id}
              to={`/product/${work._id}`}
              className={`group block ${index === 0 ? "md:col-span-2" : ""}`}
            >
              <article className="relative min-h-[420px] overflow-hidden rounded-lg bg-stone-100">
                <img
                  src={work.image[0]}
                  alt={work.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.05)_0%,rgba(12,10,9,0.74)_100%)]" />

                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    {work.subCategory}
                  </p>
                  <h3 className="prata-regular mt-3 text-3xl leading-tight">
                    {work.name}
                  </h3>
                  <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold">
                      {formatMoney(work.price)}
                    </span>
                    <span className="border-b border-white/60 pb-1 uppercase tracking-[0.18em]">
                      View Work
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedWorks;
