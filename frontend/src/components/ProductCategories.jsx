import React from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const categories = [
  {
    name: "Oil Painting",
    filterQuery: "type=Oil%20Painting",
    text: "Original canvas works with layered pigment and expressive surfaces.",
    image: assets.oilpainting_1,
  },
  {
    name: "Sculpture",
    filterQuery: "category=Sculpture",
    text: "Dimensional pieces chosen for silhouette, balance, and material presence.",
    image: assets.sculpture_2,
  },
  {
    name: "Printing",
    filterQuery: "type=Printing",
    text: "Limited print editions for collectors who want crisp detail and accessible scale.",
    image: assets.oilpainting_3,
  },
  {
    name: "Frame",
    filterQuery: "type=Frame",
    text: "Finishing options that protect the work and complete the presentation.",
    image: assets.sculpture_1,
  },
];

const ProductCategories = () => {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-stone-500">
            Explore By Form
          </p>
          <h2 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
            Product Categories
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
            A clear way for visitors to move through paintings, sculptural
            pieces, print editions, and framing.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/products?${category.filterQuery}`}
              className="group block"
            >
              <article className="relative min-h-[360px] overflow-hidden rounded-lg bg-stone-100">
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.08)_0%,rgba(12,10,9,0.78)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="prata-regular text-3xl">{category.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {category.text}
                  </p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                    Browse Category
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

export default ProductCategories;
