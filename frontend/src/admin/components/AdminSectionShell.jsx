import React from "react";

const AdminSectionShell = ({ eyebrow, title, description, action, children }) => {
  return (
    <main className="bg-[linear-gradient(180deg,_#f7f5f1_0%,_#f3eee4_100%)] pb-14">
      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-[5vw] md:px-[6vw] lg:px-6 xl:px-8">
        <div className="rounded-[34px] border border-stone-200 bg-white/90 p-6 shadow-[0_24px_70px_rgba(28,25,23,0.08)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-stone-500">
                {eyebrow}
              </p>
              <h1 className="prata-regular mt-3 text-4xl leading-tight text-stone-950 md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-stone-600 md:text-base">{description}</p>
            </div>
            {action ? <div>{action}</div> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 sm:px-[5vw] md:px-[6vw] lg:px-6 xl:px-8">
        {children}
      </section>
    </main>
  );
};

export default AdminSectionShell;
