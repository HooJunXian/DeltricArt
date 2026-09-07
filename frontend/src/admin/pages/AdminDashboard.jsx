import React, { useMemo } from "react";
import { ArrowRight, PackagePlus, ReceiptText, TriangleAlert } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminSummaryCards from "../components/AdminSummaryCards";
import AdminTable from "../components/AdminTable";
import { buttonClass, secondaryButtonClass } from "../catalogUi";
import { buildOverviewCards, formatCurrency, formatDate } from "../utils";

const statusClassMap = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  expired: "bg-stone-200 text-stone-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const AdminDashboard = () => {
  const { dashboard, loading, error } = useOutletContext();
  const overviewCards = useMemo(() => buildOverviewCards(dashboard?.stats), [dashboard]);
  const pendingOrders = dashboard?.stats?.pending_order_count ?? 0;
  const lowStock = dashboard?.stats?.low_stock_count ?? 0;
  const recentOrderColumns = useMemo(
    () => [
      {
        key: "order_number",
        label: "Order",
        render: (order) => <p className="font-semibold text-stone-900">{order.order_number}</p>,
      },
      { key: "placed_at", label: "Date", sortValue: (order) => order.placed_at, render: (order) => formatDate(order.placed_at) },
      { key: "customer", label: "Customer" },
      {
        key: "status",
        label: "Status",
        sortValue: (order) => order.status_label || order.status,
        render: (order) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[order.status] || "bg-stone-100 text-stone-700"}`}>{order.status_label || order.status}</span>,
      },
      {
        key: "total",
        label: "Total",
        align: "right",
        headerClassName: "px-3 py-3 text-right",
        cellClassName: "px-3 py-3 text-right font-semibold text-stone-900",
        sortValue: (order) => Number(order.total || 0),
        render: (order) => formatCurrency(order.total, order.currency),
      },
    ],
    [],
  );

  return (
    <AdminSectionShell
      eyebrow="Overview"
      title="Good to see you"
      description="A focused view of orders, catalog activity, and anything that needs attention."
      action={
        <div className="flex flex-wrap gap-2">
          <Link className={secondaryButtonClass} to="/admin/orders"><ReceiptText className="h-4 w-4" />View orders</Link>
          <Link className={buttonClass} to="/admin/catalog/products/new"><PackagePlus className="h-4 w-4" />Add product</Link>
        </div>
      }
    >
      <AdminDataState loading={loading} error={error}>
        <AdminSummaryCards cards={overviewCards} />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.05)]">
            <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
              <div><h2 className="text-lg font-semibold text-stone-950">Recent orders</h2><p className="mt-0.5 text-sm text-stone-500">Latest storefront purchases</p></div>
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-stone-700 hover:text-stone-950" to="/admin/orders">View all <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <AdminTable
              columns={recentOrderColumns}
              rows={(dashboard?.recent_orders ?? []).slice(0, 6)}
              loading={loading}
              emptyText="No orders have been placed yet."
              minWidth="720px"
              initialSorts={[{ key: "placed_at", direction: "desc" }]}
              getRowKey={(order) => order.id}
            />
          </section>

          <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(28,25,23,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><TriangleAlert className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-semibold text-stone-950">Needs attention</h2><p className="text-sm text-stone-500">Items to review today</p></div>
            </div>
            <div className="mt-5 space-y-3">
              <Link className="flex items-center justify-between rounded-xl border border-stone-200 p-4 transition hover:border-stone-400" to="/admin/orders">
                <div><p className="font-medium text-stone-900">Pending payments</p><p className="mt-1 text-sm text-stone-500">Review incomplete orders</p></div>
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">{pendingOrders}</span>
              </Link>
              <Link className="flex items-center justify-between rounded-xl border border-stone-200 p-4 transition hover:border-stone-400" to="/admin/catalog/products">
                <div><p className="font-medium text-stone-900">Low stock products</p><p className="mt-1 text-sm text-stone-500">Five units or fewer</p></div>
                <span className="rounded-lg bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">{lowStock}</span>
              </Link>
            </div>
          </aside>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default AdminDashboard;
