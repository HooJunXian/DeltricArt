import React from "react";

const AdminSectionShell = ({ eyebrow, title, description, action, children }) => {
  return (
    <main className="pb-12">
      <section className="mx-auto max-w-[1440px] px-4 pb-6 pt-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-stone-950">{title}</h1>
            {description ? <p className="mt-2 text-sm leading-6 text-stone-600 md:text-base">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {children}
      </section>
    </main>
  );
};

export default AdminSectionShell;
