import React from "react";
import { assets } from "../assets/assets";

const processSteps = [
  {
    title: "Study",
    text: "We begin with palette, form, proportion, and the feeling each work should leave behind.",
  },
  {
    title: "Make",
    text: "Paint, print, sculptural form, and frame choice are developed together so the final piece feels complete.",
  },
  {
    title: "Place",
    text: "Each finished work is reviewed for scale, balance, and how it lives in a room.",
  },
];

const StudioProcess = () => {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-indigo-700">
              Studio Notes
            </p>
            <h2 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              From first study to final placement
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
              The process section gives visitors a closer look at how the
              product range is shaped, selected, and prepared for display.
            </p>

            <div className="mt-8 space-y-5">
              {processSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="grid grid-cols-[48px_1fr] gap-5 border-t border-stone-200 pt-5"
                >
                  <span className="prata-regular text-3xl text-stone-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-950">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-lg">
              <img
                src={assets.oilpainting_2}
                alt="Oil painting detail"
                className="h-full min-h-[420px] w-full object-cover"
              />
            </div>
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-lg">
                <img
                  src={assets.oilpainting_3}
                  alt="Textured painting detail"
                  className="h-52 w-full object-cover sm:h-60"
                />
              </div>
              <div className="overflow-hidden rounded-lg">
                <img
                  src={assets.sculpture_3}
                  alt="Sculpture surface detail"
                  className="h-52 w-full object-cover sm:h-60"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudioProcess;
