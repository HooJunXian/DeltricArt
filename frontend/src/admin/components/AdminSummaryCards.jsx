import React from "react";

const AdminSummaryCards = ({ cards }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(28,25,23,0.05)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-500">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{card.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-500">{card.note}</p>
          </article>
        );
      })}
    </div>
  );
};

export default AdminSummaryCards;
