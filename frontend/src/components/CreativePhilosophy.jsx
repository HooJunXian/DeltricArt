import React from "react";
import { assets } from "../assets/assets";

const principles = [
  {
    title: "Material First",
    text: "Pigment, stone, paper, and frame are treated as part of the story, not just the finish.",
  },
  {
    title: "Quiet Drama",
    text: "The work is composed to feel calm from a distance and richly detailed up close.",
  },
  {
    title: "Collected Spaces",
    text: "Every piece is considered for real rooms, gallery walls, and long-term display.",
  },
];

const CreativePhilosophy = () => {
  return (
    <section className="relative left-1/2 ml-[-50vw] w-screen bg-[#f4f1ec] py-16 text-stone-950 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 sm:px-8 md:px-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-16">
        <div className="relative min-h-[440px] overflow-hidden rounded-lg">
          <img
            src={assets.sculpture_1}
            alt="Sculptural form in a gallery setting"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,241,236,0)_35%,rgba(244,241,236,0.9)_100%)]" />
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-teal-800">
            Creative Philosophy
          </p>
          <h2 className="prata-regular mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Art made to hold attention without asking for too much noise.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600">
            Our products move between oil painting, sculpture, printing, and
            framing with the same point of view: tactile work, edited forms, and
            pieces that bring atmosphere into a space.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {principles.map((principle) => (
              <div key={principle.title} className="border-t border-stone-300 pt-5">
                <h3 className="font-semibold text-stone-950">{principle.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {principle.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreativePhilosophy;
