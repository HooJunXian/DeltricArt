import React from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart3, Boxes, DollarSign, Users } from "lucide-react";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";

const reportCards = [
  {
    title: "Income sales",
    key: "paid_order_count",
    description: "Paid orders ready for financial reporting.",
    icon: DollarSign,
  },
  {
    title: "Member listing",
    key: "member_count",
    description: "Customer/member records in the system.",
    icon: Users,
  },
  {
    title: "Products sales Listing",
    key: "order_count",
    description: "Orders contributing to product sales movement.",
    icon: BarChart3,
  },
  {
    title: "stock reporting",
    key: "active_product_count",
    description: "Active products currently in the catalog.",
    icon: Boxes,
  },
];

const ReportsPage = () => {
  const { dashboard, loading, error } = useOutletContext();
  const stats = dashboard?.stats ?? {};

  return (
    <AdminSectionShell
      eyebrow="Reports"
      title="Sales, member, product, and stock reporting"
      description="A simple management view for the main report categories you asked for, using the same live admin summary data behind the dashboard."
    >
      <AdminDataState loading={loading} error={error}>
        <div className="grid gap-5 lg:grid-cols-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_20px_60px_rgba(120,113,108,0.10)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="mt-5 text-sm uppercase tracking-[0.22em] text-stone-500">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold text-stone-950">{stats[card.key] ?? 0}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{card.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(120,113,108,0.10)]">
            <h2 className="prata-regular text-3xl text-stone-950">Member listing</h2>
            <div className="mt-6 space-y-4">
              {(dashboard?.recent_members ?? []).map((member) => (
                <article key={member.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-lg font-semibold text-stone-950">{member.name}</h3>
                  <p className="text-sm text-stone-600">{member.email || member.username}</p>
                  <p className="mt-2 text-sm text-stone-600">{member.default_address || "No saved address"}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-stone-200 bg-[#a66a2c] p-6 text-white shadow-[0_20px_60px_rgba(120,113,108,0.14)]">
            <h2 className="prata-regular text-3xl">Stock reporting</h2>
            <div className="mt-6 space-y-3">
              {(dashboard?.catalog_snapshot ?? []).map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/15 bg-white/10 px-4 py-4">
                  <p className="text-sm text-amber-50/90">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default ReportsPage;
