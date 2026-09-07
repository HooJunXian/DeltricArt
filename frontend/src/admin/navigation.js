import {
  Building2,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

export const adminNavSections = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Orders", to: "/admin/orders", icon: ReceiptText },
  {
    label: "Catalog",
    icon: Package,
    items: [
      { label: "Products", to: "/admin/catalog/products", icon: Package },
      { label: "Categories", to: "/admin/catalog/categories", icon: Tags },
    ],
  },
  { label: "Customers", to: "/admin/customers", icon: Users },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Company profile", to: "/admin/settings/company", icon: Building2 },
      { label: "Staff & access", to: "/admin/settings/access", icon: ShieldCheck },
    ],
  },
];

export const adminPageNames = {
  "/admin": "Overview",
  "/admin/orders": "Orders",
  "/admin/sales-office": "Orders",
  "/admin/catalog/products": "Products",
  "/admin/inventory/products": "Products",
  "/admin/catalog/products/new": "Add product",
  "/admin/inventory/products/new": "Add product",
  "/admin/catalog/categories": "Categories",
  "/admin/inventory/categories": "Categories",
  "/admin/customers": "Customers",
  "/admin/settings/company": "Company profile",
  "/admin/company": "Company profile",
  "/admin/settings/access": "Staff & access",
  "/admin/setup": "Staff & access",
};
