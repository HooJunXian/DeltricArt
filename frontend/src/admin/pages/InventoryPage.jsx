import React from "react";
import { Link } from "react-router-dom";
import { Boxes, PackagePlus, Tags } from "lucide-react";

import AdminSectionShell from "../components/AdminSectionShell";

const inventoryCards = [
  {
    title: "Add/Edit Categories",
    description: "Create category groups, edit descriptions, and control active status.",
    to: "/admin/inventory/categories",
    icon: Tags,
  },
  {
    title: "Add/Edit Products",
    description: "Open a focused form for product details, pricing, stock, image, and status.",
    to: "/admin/inventory/products/new",
    icon: PackagePlus,
  },
  {
    title: "Products Listing",
    description: "Search, filter, review, edit, and deactivate product records.",
    to: "/admin/inventory/products",
    icon: Boxes,
  },
];

const InventoryPage = () => {
  return (
    <AdminSectionShell
      eyebrow="Inventory"
      title="Catalog management"
      description="Choose a focused workspace for categories, product forms, or product listing review. Each page uses the same admin-only dashboard API without relying on Django's default admin panel."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {inventoryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              className="group border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(28,25,23,0.06)] transition hover:-translate-y-0.5 hover:border-stone-950 hover:shadow-[0_24px_70px_rgba(28,25,23,0.10)]"
              to={card.to}
            >
              <div className="flex h-12 w-12 items-center justify-center bg-stone-950 text-white">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-stone-950">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{card.description}</p>
              <p className="mt-5 text-sm font-semibold text-stone-950 underline-offset-4 group-hover:underline">
                Open page
              </p>
            </Link>
          );
        })}
      </div>
    </AdminSectionShell>
  );
};

export default InventoryPage;
