import React from "react";

const AdminSummaryCards = ({ cards }) => {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="rounded-[28px] border border-stone-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(120,113,108,0.10)]"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone}`}
            >
              <Icon className="h-7 w-7 text-stone-950" strokeWidth={1.8} />
            </div>
            <p className="mt-5 text-sm uppercase tracking-[0.22em] text-stone-500">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{card.note}</p>
          </article>
        );
      })}
    </div>
  );
};

export default AdminSummaryCards;
