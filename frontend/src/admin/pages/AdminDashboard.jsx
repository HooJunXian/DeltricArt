import React, { useMemo } from "react";
import {
  BadgeCheck,
  Boxes,
  CreditCard,
  FolderKanban,
  PackagePlus,
  ShieldCheck,
  ShoppingBag,
  UserCog,
  Users,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminSummaryCards from "../components/AdminSummaryCards";
import { buildOverviewCards, formatCurrency, formatDate, getMemberTag } from "../utils";

const quickActions = [
  {
    title: "Grant roles and permissions",
    description: "Assign staff into role groups and manage access by responsibility.",
    icon: BadgeCheck,
  },
  {
    title: "Manage products and categories",
    description: "Create products, update price, inventory, and catalog structure.",
    icon: PackagePlus,
  },
  {
    title: "Review member information",
    description: "Browse profile, contact details, marketing preference, and addresses.",
    icon: Users,
  },
  {
    title: "Track member orders",
    description: "Follow each order from payment through shipping and completion.",
    icon: ShoppingBag,
  },
];

const statusClassMap = {
  paid: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-slate-200 text-slate-700",
  shipped: "bg-sky-100 text-sky-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const AdminDashboard = () => {
  const { dashboard, loading, error } = useOutletContext();
  const overviewCards = useMemo(() => buildOverviewCards(dashboard?.stats), [dashboard]);

  return (
    <AdminSectionShell
      eyebrow="Dashboard"
      title="Admin landing page and operational highlights"
      description="This is the main landing page after admin login, showing delivery status, latest member purchase records, and the most important setup, catalog, and access summaries."
    >
      <AdminDataState loading={loading} error={error}>
        <AdminSummaryCards cards={overviewCards} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-stone-900/8 bg-white/75 p-6 shadow-[0_20px_60px_rgba(120,113,108,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Core Functions
            </p>
            <h2 className="prata-regular mt-3 text-3xl text-stone-900">
              What this panel is built to handle
            </h2>
            <div className="mt-6 grid gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <article
                    key={action.title}
                    className="flex gap-4 rounded-3xl border border-stone-900/8 bg-stone-50/80 p-4"
                  >
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-stone-900 text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">{action.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {action.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-stone-900/8 bg-[#a66a2c] p-6 text-white shadow-[0_20px_60px_rgba(120,113,108,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-100/90">
              Catalog Snapshot
            </p>
            <h2 className="prata-regular mt-3 text-3xl leading-tight">
              Simple, warm, and easy to scan.
            </h2>
            <div className="mt-8 grid gap-3">
              {(dashboard?.catalog_snapshot ?? []).map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/15 bg-white/10 px-4 py-4"
                >
                  <p className="text-sm text-amber-50/90">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-8 lg:col-span-2 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[30px] border border-stone-900/8 bg-white/78 p-6 shadow-[0_20px_60px_rgba(120,113,108,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                    Members
                  </p>
                  <h2 className="prata-regular mt-3 text-3xl text-stone-900">
                    Customer information at a glance
                  </h2>
                </div>
                <Users className="h-10 w-10 text-stone-900" strokeWidth={1.6} />
              </div>

              <div className="mt-6 space-y-4">
                {(dashboard?.recent_members ?? []).map((member) => (
                  <article
                    key={member.id}
                    className="rounded-3xl border border-stone-900/8 bg-stone-50/80 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{member.name}</h3>
                        <p className="text-sm text-stone-600">{member.email || member.username}</p>
                      </div>
                      <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        {getMemberTag(member)}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
                      <span>{member.phone || "No phone yet"}</span>
                      <span className="text-stone-300">|</span>
                      <span>{member.marketing_consent ? "Marketing on" : "Marketing off"}</span>
                      <span className="text-stone-300">|</span>
                      <span>{member.default_address || "No saved address"}</span>
                    </div>
                  </article>
                ))}
                {!loading && (dashboard?.recent_members?.length ?? 0) === 0 ? (
                  <article className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/60 p-4 text-sm text-stone-500">
                    No member records are available yet.
                  </article>
                ) : null}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-[30px] border border-stone-900/8 bg-stone-950 p-6 text-white shadow-[0_20px_60px_rgba(41,37,36,0.24)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
                  Delivery Status
                </p>
                <h2 className="prata-regular mt-3 text-3xl text-white">
                  Latest member purchase records
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {(dashboard?.order_status_summary ?? []).map((item) => (
                      <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-sm text-stone-300">{item.label}</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {(dashboard?.recent_orders ?? []).map((order) => (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">
                            {order.order_number}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-white">{order.customer}</h3>
                          <p className="mt-1 text-sm text-stone-300">{order.primary_item}</p>
                          <p className="mt-2 text-xs text-stone-400">{formatDate(order.placed_at)}</p>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                              statusClassMap[order.status] || "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {order.status}
                          </span>
                          <p className="text-base font-semibold text-white">
                            {formatCurrency(order.total, order.currency)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!loading && (dashboard?.recent_orders?.length ?? 0) === 0 ? (
                    <article className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-stone-400">
                      No orders have been placed yet.
                    </article>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[30px] border border-stone-900/8 bg-white/78 p-6 shadow-[0_20px_60px_rgba(120,113,108,0.12)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                      Products
                    </p>
                    <h2 className="prata-regular mt-3 text-3xl text-stone-900">
                      Recently updated catalog items
                    </h2>
                  </div>
                  <Boxes className="h-10 w-10 text-stone-900" strokeWidth={1.6} />
                </div>

                <div className="mt-6 space-y-4">
                  {(dashboard?.recent_products ?? []).map((product) => (
                    <article
                      key={product.id}
                      className="rounded-3xl border border-stone-900/8 bg-stone-50/80 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900">{product.name}</h3>
                          <p className="text-sm text-stone-600">
                            {product.code || "No code"} / {product.category_name || "Uncategorized"}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-base font-semibold text-stone-900">
                            {formatCurrency(product.price, "MYR")}
                          </p>
                          <p className="text-sm text-stone-600">
                            Stock {product.stock_balance} / Reserved {product.reserved_quantity}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!loading && (dashboard?.recent_products?.length ?? 0) === 0 ? (
                    <article className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/60 p-4 text-sm text-stone-500">
                      No product updates are available yet.
                    </article>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default AdminDashboard;
