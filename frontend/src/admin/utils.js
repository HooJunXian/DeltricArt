import { BadgeCheck, BadgeDollarSign, Boxes, ShoppingBag, TriangleAlert } from "lucide-react";

export const currencyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

export const formatCurrency = (amount, currency = "MYR") => {
  if (currency && currency !== "MYR") {
    return `${currency} ${amount}`;
  }

  const numeric = Number(amount ?? 0);
  return currencyFormatter.format(Number.isNaN(numeric) ? 0 : numeric);
};

export const formatDate = (value) => {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export const getMemberTag = (member) => {
  if ((member.order_count ?? 0) >= 3) {
    return "Returning buyer";
  }
  if ((member.order_count ?? 0) >= 1) {
    return "Active customer";
  }
  return "New member";
};

export const buildOverviewCards = (stats) => {
  if (!stats) {
    return [];
  }

  return [
    {
      title: "This month's earnings",
      value: formatCurrency(stats.monthly_earnings, stats.monthly_earnings_currency),
      note: "Revenue from paid orders this calendar month.",
      icon: BadgeDollarSign,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      title: "Total orders",
      value: String(stats.order_count ?? 0),
      note: "Orders submitted through the storefront.",
      icon: ShoppingBag,
      tone: "bg-stone-100 text-stone-700",
    },
    {
      title: "Paid orders",
      value: String(stats.paid_order_count ?? 0),
      note: "Successfully paid customer orders.",
      icon: BadgeCheck,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Active products",
      value: String(stats.active_product_count ?? 0),
      note: `${stats.category_count ?? 0} categories in the catalog.`,
      icon: Boxes,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      title: "Low stock",
      value: String(stats.low_stock_count ?? 0),
      note: "Active products with five units or fewer.",
      icon: TriangleAlert,
      tone: "bg-amber-100 text-amber-700",
    },
  ];
};
