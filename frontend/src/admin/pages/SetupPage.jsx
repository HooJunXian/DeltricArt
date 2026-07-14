import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Building2, KeyRound, ShieldPlus } from "lucide-react";

import AdminDataState from "../components/AdminDataState";
import AdminSectionShell from "../components/AdminSectionShell";

const setupCards = [
  {
    title: "Role visibility",
    description: "Review role groups returned by the staff-only dashboard API.",
    icon: ShieldPlus,
  },
  {
    title: "Access enforcement",
    description: "React routes verify staff access and Django REST endpoints enforce admin permission.",
    icon: KeyRound,
  },
  {
    title: "Company details",
    description: "Maintain the company profile used by storefront footer contact details.",
    icon: Building2,
    to: "/admin/company",
  },
];

const SetupPage = () => {
  const { dashboard, loading, error } = useOutletContext();

  return (
    <AdminSectionShell
      eyebrow="Setup"
      title="Project setup and permission controls"
      description="This section is where the team maintains company details, admin user access, and permission structures for the whole project."
    >
      <AdminDataState loading={loading} error={error}>
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {setupCards.map((card) => {
            const Icon = card.icon;

            const Card = card.to ? Link : "article";

            return (
              <Card
                key={card.title}
                to={card.to}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_20px_60px_rgba(120,113,108,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(120,113,108,0.14)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-stone-950">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{card.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(120,113,108,0.10)]">
          <h2 className="prata-regular text-3xl text-stone-950">Current roles</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(dashboard?.roles ?? []).map((role) => (
              <article key={role.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                <h3 className="text-lg font-semibold text-stone-950">{role.name}</h3>
                <p className="mt-2 text-sm text-stone-600">
                  {role.permission_count} permissions / {role.member_count} members
                </p>
              </article>
            ))}
          </div>
        </div>
      </AdminDataState>
    </AdminSectionShell>
  );
};

export default SetupPage;
