import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";
import AdminTable from "../components/AdminTable";
import { formatDate } from "../utils";

const CustomersPage = () => {
  const { dashboard, loading, error } = useOutletContext();
  const customerColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Customer",
        render: (member) => <div><p className="font-semibold text-stone-900">{member.name}</p><p className="mt-0.5 text-xs text-stone-500">@{member.username}</p></div>,
      },
      { key: "email", label: "Email", render: (member) => member.email || "—" },
      { key: "mobile", label: "Mobile", render: (member) => member.mobile || "—" },
      {
        key: "status",
        label: "Status",
        render: (member) => <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">{member.status || "Active"}</span>,
      },
      { key: "date_joined", label: "Joined", sortValue: (member) => member.date_joined, render: (member) => formatDate(member.date_joined) },
    ],
    [],
  );

  return (
    <AdminSectionShell eyebrow="Customers" title="Customer directory" description="A sortable view of recently registered customer accounts.">
      <AdminDataState loading={loading} error={error}>
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.05)]">
          <div className="border-b border-stone-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-stone-950">Recent customers</h2>
            <p className="mt-0.5 text-sm text-stone-500">{dashboard?.stats?.member_count ?? 0} customer accounts</p>
          </div>
          <AdminTable
            columns={customerColumns}
            rows={dashboard?.recent_members ?? []}
            loading={loading}
            emptyText="No customer accounts yet."
            minWidth="760px"
            initialSorts={[{ key: "date_joined", direction: "desc" }]}
            getRowKey={(member) => member.id}
          />
        </section>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default CustomersPage;
