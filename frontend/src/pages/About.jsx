import React from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const customerGroups = [
  "Interior designers",
  "Art galleries",
  "Hotels",
  "Show houses",
  "Service apartments",
  "Corporate offices",
  "Home owners",
  "Project consultants",
];

const strengths = [
  {
    title: "One-Stop Supply",
    text: "Painting, artwork framing, framing materials, and decor support are handled through one experienced source.",
  },
  {
    title: "Global Sourcing",
    text: "Wide and strategic sourcing helps the company serve specific materials, finishes, and artwork requirements.",
  },
  {
    title: "Professional Consultation",
    text: "Every relationship is supported with practical advice for artwork selection, framing, display, and project needs.",
  },
];

const testimonials = [
  {
    name: "Lee SY",
    quote:
      "Very patient with my questions. I also had some issues with payment and they were understanding. Lots of help with shipping. Great purchase.",
    avatar: assets.profile_icon,
  },
  {
    name: "Brandon",
    quote:
      "Response to questions was fast. Delivered product as promised and on-time. Great!",
    avatar: assets.profile_icon,
  },
  {
    name: "Amir",
    quote: "This art work is beautiful. It fits perfectly with my decor. Thank you.",
    avatar: assets.profile_icon,
  },
];

const About = () => {
  const testimonialLoop = [...testimonials, ...testimonials];

  return (
    <main className="pb-20 pt-10 text-stone-950">
      <section className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-rose-700">
              About Deltric Art
            </p>
            <h1 className="prata-regular mt-5 text-5xl leading-tight sm:text-6xl lg:text-7xl">
              Quality home decor at an affordable price.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-stone-600">
              DELTRIC ART DESIGN SDN. BHD. is focused on one-stop supplies for
              painting and artwork framing, with experience in international
              trading of framing materials and paintings.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="flex min-h-12 items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
              >
                View Products
              </Link>
              <Link
                to="/contact"
                className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-950 transition hover:border-stone-950"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-[0.8fr_1fr] gap-4">
            <div className="overflow-hidden rounded-lg bg-stone-100">
              <img
                src={assets.sculpture_1}
                alt="Sculptural home decor piece"
                className="h-full min-h-[420px] w-full object-cover"
              />
            </div>
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-lg bg-stone-100">
                <img
                  src={assets.oilpainting_2}
                  alt="Oil painting artwork detail"
                  className="h-52 w-full object-cover sm:h-60"
                />
              </div>
              <div className="overflow-hidden rounded-lg bg-stone-100">
                <img
                  src={assets.sculpture_3}
                  alt="Decor sculpture detail"
                  className="h-52 w-full object-cover sm:h-60"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 ml-[-50vw] mt-20 w-screen bg-[#f4f1ec] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 sm:px-8 md:px-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-teal-800">
              Since 2003
            </p>
            <h2 className="prata-regular mt-4 text-4xl leading-tight sm:text-5xl">
              Built for art, framing, and interior projects.
            </h2>
          </div>

          <div className="space-y-6 text-base leading-8 text-stone-700">
            <p>
              Registered in 2003, DELTRIC ART DESIGN SDN. BHD. grew as a new
              and energetic company serving customers across design, hospitality,
              gallery, commercial, and residential spaces.
            </p>
            <p>
              The company&apos;s strength is its wide global sourcing network and
              in-depth understanding of high-end artwork and framing material
              requirements, especially for niche customer needs.
            </p>
            <p>
              We believe in long-term business relationships built through
              continuous support, reliable service, and professional
              consultation.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {strengths.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
            >
              <h3 className="text-xl font-semibold text-stone-950">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-stone-500">
              Who We Serve
            </p>
            <h2 className="prata-regular mt-4 text-4xl leading-tight sm:text-5xl">
              Trusted by professionals and everyday spaces.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
              From statement art pieces to complete framing support, Deltric Art
              works with clients who need dependable quality, practical sourcing,
              and decor that suits the room.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {customerGroups.map((group) => (
              <div
                key={group}
                className="flex min-h-[96px] items-center justify-center rounded-lg border border-stone-200 bg-stone-50 px-4 text-center text-sm font-semibold text-stone-800"
              >
                {group}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative left-1/2 ml-[-50vw] mt-20 w-screen bg-[#f7f4ef] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-rose-700">
                Customer Care
              </p>
              <h2 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
                Customer satisfaction is our pride.
              </h2>
            </div>
            <p className="max-w-3xl pt-1 text-base leading-8 text-stone-600">
              We work with our customers to understand the messaging and
              experience they want to convey. We then offer our ideas and
              designs according to different occasions.
            </p>
          </div>

          <div className="mt-14">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.34em] text-stone-500">
                  Client Comments
                </p>
                <h3 className="prata-regular mt-3 text-4xl text-stone-950">
                  What Our Clients Say
                </h3>
              </div>
              <p className="max-w-2xl pt-1 text-sm leading-7 text-stone-600">
                Real feedback from customers who worked with us for artwork,
                decor, framing support, and delivery.
              </p>
            </div>

            <div className="testimonial-marquee mt-8 overflow-hidden py-3">
              <div className="testimonial-marquee-track flex w-max gap-6">
                {testimonialLoop.map((item, index) => (
                  <article
                    key={`${item.name}-${index}`}
                    className="flex min-h-[280px] w-[86vw] max-w-[380px] flex-col rounded-lg border border-stone-200/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:w-[360px]"
                  >
                    <p className="text-base leading-8 text-stone-700">
                      &quot;{item.quote}&quot;
                    </p>

                    <div
                      className="mt-5 flex gap-1 text-xl leading-none text-red-500"
                      aria-label="5 out of 5 stars"
                    >
                      <span>&#9733;</span>
                      <span>&#9733;</span>
                      <span>&#9733;</span>
                      <span>&#9733;</span>
                      <span>&#9733;</span>
                    </div>

                    <div className="mt-auto flex items-center gap-4 pt-6">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-stone-100">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-800">{item.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Client
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl overflow-hidden rounded-lg bg-stone-950 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 sm:p-10 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-white/55">
              Our Promise
            </p>
            <h2 className="prata-regular mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
              Continuous support from selection to final display.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">
              Whether the project needs paintings, framing material, or artwork
              consultation, our goal is to make the process clear, reliable, and
              suitable for the client&apos;s space and budget.
            </p>
          </div>
          <div className="min-h-[320px] overflow-hidden">
            <img
              src={assets.oilpainting_1}
              alt="Featured painting for interior display"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
