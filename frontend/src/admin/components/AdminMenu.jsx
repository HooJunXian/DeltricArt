import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { adminNavSections } from "../navigation";

const getNavClass = ({ isActive }) =>
  [
    "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-stone-950 text-white"
      : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
  ].join(" ");

const AdminMenu = () => {
  return (
    <nav className="hidden min-w-0 flex-wrap items-center gap-1 lg:flex xl:gap-2">
      {adminNavSections.map((section) => {
        const Icon = section.icon;

        return (
          <div key={section.to} className="group relative py-2">
            <NavLink to={section.to} end={section.to === "/admin"} className={getNavClass}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span>{section.label}</span>
              {section.items.length > 1 ? <ChevronDown className="h-4 w-4" strokeWidth={1.8} /> : null}
            </NavLink>

            <div className="invisible absolute left-0 top-full z-50 w-80 pt-2 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="translate-y-1 rounded-3xl border border-stone-200 bg-white p-3 shadow-[0_24px_60px_rgba(28,25,23,0.14)] transition duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0">
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  {section.label}
                </p>
                <div className="mt-3 space-y-3">
                  {section.items.map((item) => {
                    const className =
                      "block rounded-2xl border border-stone-200 bg-white px-3 py-3 transition hover:border-stone-950";

                    if (item.to) {
                      return (
                        <Link key={item.label} className={className} to={item.to}>
                          <p className="text-sm font-semibold text-stone-950">{item.label}</p>
                          <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                        </Link>
                      );
                    }

                    return (
                      <div key={item.label} className={className}>
                        <p className="text-sm font-semibold text-stone-950">{item.label}</p>
                        <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default AdminMenu;
