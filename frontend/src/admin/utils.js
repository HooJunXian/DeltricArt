import { Boxes, CreditCard, ShieldCheck, UserCog } from "lucide-react";

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
      title: "Protected Superadmin",
      value: String(stats.protected_superadmin_count ?? 0),
      note: "Reserved full-access account locked from edit and delete.",
      icon: ShieldCheck,
      tone: "from-amber-300 via-orange-300 to-rose-300",
    },
    {
      title: "Admin Roles",
      value: String(stats.admin_role_count ?? 0),
      note: "Live role groups available for staff assignment.",
      icon: UserCog,
      tone: "from-sky-300 via-cyan-300 to-emerald-300",
    },
    {
      title: "Catalog Controls",
      value: `${stats.product_count ?? 0} products / ${stats.category_count ?? 0} categories`,
      note: `${stats.active_product_count ?? 0} products are currently active.`,
      icon: Boxes,
      tone: "from-fuchsia-300 via-pink-300 to-rose-300",
    },
    {
      title: "Order Oversight",
      value: `${stats.order_count ?? 0} orders`,
      note: `${stats.paid_order_count ?? 0} paid purchases from ${stats.member_count ?? 0} members.`,
      icon: CreditCard,
      tone: "from-lime-300 via-emerald-300 to-teal-300",
    },
  ];
};
