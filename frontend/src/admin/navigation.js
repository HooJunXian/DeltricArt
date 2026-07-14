import {
  ChartColumnBig,
  Cog,
  LayoutDashboard,
  Package,
  ReceiptText,
} from "lucide-react";

export const adminNavSections = [
  {
    label: "Dashboard",
    to: "/admin",
    icon: LayoutDashboard,
    items: [
      { label: "Overview", description: "Delivery status and latest purchase activity" },
    ],
  },
  {
    label: "Inventory",
    to: "/admin/inventory",
    icon: Package,
    items: [
      {
        label: "Add/Edit Categories",
        description: "Maintain category names, descriptions, and status",
        to: "/admin/inventory/categories",
      },
      {
        label: "Add Products",
        description: "Create new catalog items from a focused product form",
        to: "/admin/inventory/products/new",
      },
      {
        label: "Products Listing",
        description: "Filter, review, edit, and deactivate catalog items",
        to: "/admin/inventory/products",
      },
    ],
  },
  {
    label: "Sales Office",
    to: "/admin/sales-office",
    icon: ReceiptText,
    items: [
      { label: "Sales Submitted", description: "Review recent submitted and processed orders" },
    ],
  },
  {
    label: "Reports",
    to: "/admin/reports",
    icon: ChartColumnBig,
    items: [
      { label: "Income sales", description: "Monitor paid order totals" },
      { label: "Member listing", description: "Review customer/member records" },
      { label: "Products sales Listing", description: "See latest purchased products" },
      { label: "stock reporting", description: "Track active stock and low stock health" },
    ],
  },
  {
    label: "Setup",
    to: "/admin/setup",
    icon: Cog,
    items: [
      { label: "Admin roles", description: "Review staff role groups exposed by the dashboard API" },
      { label: "Admin access", description: "Only staff and superusers can enter these pages" },
      { label: "Company details", description: "Maintain storefront company contact information", to: "/admin/company" },
    ],
  },
];
