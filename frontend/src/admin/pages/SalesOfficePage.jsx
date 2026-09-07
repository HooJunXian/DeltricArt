import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { useOutletContext } from "react-router-dom";

import api from "../../api";
import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminTable from "../components/AdminTable";
import { inputClass, secondaryButtonClass } from "../catalogUi";
import { formatCurrency, formatDate } from "../utils";

const defaultFilters = {
  orderId: "",
  customer: "",
  status: "",
  month: "",
  date: "",
};

const statusClassMap = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  expired: "bg-stone-200 text-stone-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const SalesOfficePage = () => {
  const { dashboard, loading, error } = useOutletContext();
  const [filters, setFilters] = useState(defaultFilters);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [tableResetKey, setTableResetKey] = useState(0);

  const loadOrders = useCallback(async (orderFilters) => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const params = new URLSearchParams();
      if (orderFilters.orderId.trim()) params.set("order_id", orderFilters.orderId.trim());
      if (orderFilters.customer.trim()) params.set("customer", orderFilters.customer.trim());
      if (orderFilters.status) params.set("status", orderFilters.status);
      if (orderFilters.date) params.set("date", orderFilters.date);
      else if (orderFilters.month) params.set("month", orderFilters.month);

      const response = await api.get(`/api/admin/orders/${params.toString() ? `?${params}` : ""}`);
      setOrders(response.data);
    } catch (err) {
      setOrdersError(
        err.response?.status === 403
          ? "Only admin users can view orders."
          : "Unable to load orders right now.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadOrders(filters), 250);
    return () => window.clearTimeout(timer);
  }, [filters, loadOrders]);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setTableResetKey((current) => current + 1);
  };

  const orderColumns = useMemo(
    () => [
      {
        key: "order_number",
        label: "Order ID",
        render: (order) => <p className="font-semibold text-stone-900">{order.order_number}</p>,
      },
      {
        key: "placed_at",
        label: "Date",
        sortValue: (order) => order.placed_at,
        render: (order) => formatDate(order.placed_at),
      },
      {
        key: "customer",
        label: "Customer",
        sortValue: (order) => order.username || order.customer,
        render: (order) => (
          <div>
            <p className="font-medium text-stone-800">{order.customer}</p>
            <p className="mt-0.5 text-xs text-stone-500">@{order.username} · {order.email}</p>
          </div>
        ),
      },
      { key: "primary_item", label: "Items", cellClassName: "max-w-xs px-3 py-3 text-stone-600" },
      {
        key: "fulfillment",
        label: "Fulfilment",
        render: (order) => <span className="capitalize text-stone-600">{order.fulfillment?.replace("_", " ") || "—"}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortValue: (order) => order.status_label || order.status,
        render: (order) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[order.status] || "bg-stone-100 text-stone-700"}`}>
            {order.status_label || order.status}
          </span>
        ),
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
    <AdminSectionShell eyebrow="Orders" title="Customer orders" description="Search, filter, and sort storefront purchases.">
      <AdminDataState loading={loading} error={error}>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(dashboard?.order_status_summary ?? []).map((item) => (
            <button
              className={`rounded-2xl border bg-white px-4 py-3 text-left transition hover:border-stone-400 ${filters.status === item.status ? "border-stone-950 ring-1 ring-stone-950" : "border-stone-200"}`}
              key={item.status}
              onClick={() => setFilters((current) => ({ ...current, status: current.status === item.status ? "" : item.status }))}
              type="button"
            >
              <p className="text-sm text-stone-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-stone-950">{item.value}</p>
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.05)]">
          <div className="border-b border-stone-200 p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <label className="block flex-1">
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Order ID</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input className={`${inputClass} pl-9`} placeholder="Search order ID" value={filters.orderId} onChange={(event) => setFilters((current) => ({ ...current, orderId: event.target.value }))} />
                </span>
              </label>
              <label className="block flex-1">
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Customer</span>
                <input className={inputClass} placeholder="Name, username, or email" value={filters.customer} onChange={(event) => setFilters((current) => ({ ...current, customer: event.target.value }))} />
              </label>
              <label className="block xl:w-44">
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Status</span>
                <select className={inputClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">All statuses</option>
                  {(dashboard?.order_status_summary ?? []).map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}
                </select>
              </label>
              <label className="block xl:w-44">
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Month</span>
                <input className={inputClass} type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value, date: "" }))} />
              </label>
              <label className="block xl:w-44">
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Exact date</span>
                <input className={inputClass} type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value, month: "" }))} />
              </label>
              <div className="flex gap-2">
                <button className={secondaryButtonClass} onClick={() => loadOrders(filters)} type="button" title="Refresh orders"><RefreshCw className="h-4 w-4" /><span className="sr-only">Refresh</span></button>
                <button className={secondaryButtonClass} onClick={resetFilters} type="button"><RotateCcw className="h-4 w-4" />Reset</button>
              </div>
            </div>
            <p className="mt-4 text-sm text-stone-500">{ordersLoading ? "Loading orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"} found`}</p>
            {ordersError ? <p className="mt-2 text-sm font-medium text-rose-700">{ordersError}</p> : null}
          </div>

          <AdminTable
            key={tableResetKey}
            columns={orderColumns}
            rows={orders}
            loading={ordersLoading}
            loadingText="Loading orders..."
            emptyText="No orders match the current filters."
            minWidth="1100px"
            initialSorts={[{ key: "placed_at", direction: "desc" }]}
            getRowKey={(order) => order.id}
          />
        </section>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default SalesOfficePage;
