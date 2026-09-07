import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";

const SetupPage = () => {
  const { dashboard, loading, error } = useOutletContext();

  return (
    <AdminSectionShell eyebrow="Settings" title="Staff and access" description="Review administrator roles and company settings.">
      <AdminDataState loading={loading} error={error}>
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Link className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(28,25,23,0.05)] transition hover:border-stone-400" to="/admin/settings/company">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Building2 className="h-5 w-5" /></div>
            <h2 className="mt-4 text-lg font-semibold text-stone-950">Company profile</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">Update the name, logo, contact details, and storefront information.</p>
            <p className="mt-4 text-sm font-semibold text-stone-800">Open company settings →</p>
          </Link>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(28,25,23,0.05)]">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700"><ShieldCheck className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-semibold text-stone-950">Admin roles</h2><p className="text-sm text-stone-500">Current access groups</p></div>
            </div>
            <div className="mt-4 divide-y divide-stone-100">
              {(dashboard?.roles ?? []).map((role) => (
                <div className="flex items-center justify-between gap-4 py-3" key={role.id}>
                  <div><p className="font-medium text-stone-900">{role.name}</p><p className="mt-0.5 text-sm text-stone-500">{role.permission_count} permissions</p></div>
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-sm font-semibold text-stone-700">{role.member_count} staff</span>
                </div>
              ))}
              {!loading && (dashboard?.roles?.length ?? 0) === 0 ? <p className="py-5 text-sm text-stone-500">No role groups configured.</p> : null}
            </div>
          </section>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default SetupPage;
