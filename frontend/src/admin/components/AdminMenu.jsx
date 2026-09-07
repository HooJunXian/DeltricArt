import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { adminNavSections } from "../navigation";

const navItemClass = ({ isActive }) =>
  [
    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
    isActive
      ? "bg-white text-stone-950 shadow-sm"
      : "text-stone-300 hover:bg-white/8 hover:text-white",
  ].join(" ");

const AdminMenu = ({ onNavigate }) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(
      adminNavSections
        .filter((section) => section.items)
        .map((section) => [
          section.label,
          section.items.some((item) => location.pathname.startsWith(item.to)),
        ]),
    ),
  );

  const toggleGroup = (label) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <nav aria-label="Admin navigation" className="space-y-1 px-3 py-5">
      {adminNavSections.map((section) => {
        const Icon = section.icon;

        if (!section.items) {
          return (
            <NavLink
              key={section.to}
              className={navItemClass}
              end={section.end}
              onClick={onNavigate}
              to={section.to}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              <span>{section.label}</span>
            </NavLink>
          );
        }

        const expanded = Boolean(openGroups[section.label]);
        const groupId = `admin-nav-${section.label.toLowerCase().replace(/\s+/g, "-")}`;

        return (
          <div key={section.label} className="pt-2">
            <button
              aria-controls={groupId}
              aria-expanded={expanded}
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-400 transition hover:bg-white/8 hover:text-white"
              onClick={() => toggleGroup(section.label)}
              type="button"
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{section.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180 text-stone-300" : ""}`} />
            </button>
            <div
              className={`ml-5 grid border-l border-white/10 pl-3 transition-[grid-template-rows,opacity,margin] duration-200 ${
                expanded ? "mt-1 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
              id={groupId}
            >
              <div className="min-h-0 space-y-1 overflow-hidden">
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    className={navItemClass}
                    onClick={onNavigate}
                    tabIndex={expanded ? undefined : -1}
                    to={item.to}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default AdminMenu;
