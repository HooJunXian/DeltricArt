import React from "react";
import { useOutletContext } from "react-router-dom";
import { ClipboardCheck, Truck } from "lucide-react";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";
import { formatCurrency, formatDate } from "../utils";

const statusClassMap = {
  paid: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-slate-200 text-slate-700",
  shipped: "bg-sky-100 text-sky-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const SalesOfficePage = () => {
  const { dashboard, loading, error } = useOutletContext();

  return (
    <AdminSectionShell
      eyebrow="Sales Office"
      title="Sales submitted and delivery follow-up"
      description="This page gives your team a clear look at recent purchase submissions and the delivery/fulfillment status that matters most during daily operations."
    >
      <AdminDataState loading={loading} error={error}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] border border-stone-200 bg-stone-950 p-6 text-white shadow-[0_20px_60px_rgba(41,37,36,0.22)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Truck className="h-6 w-6 text-amber-300" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Delivery Status</p>
                <h2 className="prata-regular mt-1 text-3xl text-white">Operational snapshot</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {(dashboard?.order_status_summary ?? []).map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm text-stone-300">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(120,113,108,0.10)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                <ClipboardCheck className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Sales Submitted</p>
                <h2 className="prata-regular mt-1 text-3xl text-stone-950">Latest purchase records</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {(dashboard?.recent_orders ?? []).map((order) => (
                <article key={order.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{order.order_number}</p>
                      <h3 className="mt-1 text-lg font-semibold text-stone-950">{order.customer}</h3>
                      <p className="text-sm text-stone-600">{order.primary_item}</p>
                      <p className="mt-2 text-xs text-stone-500">{formatDate(order.placed_at)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          statusClassMap[order.status] || "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="font-semibold text-stone-950">{formatCurrency(order.total, order.currency)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default SalesOfficePage;
