import React, { useContext, useMemo } from "react";
import { ArrowUpRight, Building2, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { assets } from "../../assets/assets";
import { ShopContext } from "../context/shop-context";

const defaultCompany = {
  cName: "Deltric Art Gallery",
  cAddress1: "No. 5-02, Jalan Kenari 17f",
  cAddress2: "Bandar Puchong Jaya",
  cPostcode: "47100",
  cCity: "Puchong",
  cState: "Selangor",
  cOfficeNo: "03-5879 5384",
  cOfficeTelNo: "010-839 4195",
  cOwner: "Fannie",
  cOwnerTelNo: "012-331 7877",
  cOfficeEmail: "deltric_art@deltric.com.my",
  cOwnerEmail: "fannie@deltric.com.my",
};

const phoneHref = (number) => `tel:${String(number).replace(/[^+\d]/g, "")}`;

const Contact = () => {
  const { company: loadedCompany } = useContext(ShopContext);
  const company = useMemo(
    () => ({ ...defaultCompany, ...(loadedCompany?.cName ? loadedCompany : {}) }),
    [loadedCompany]
  );

  const address = [
    company.cAddress1,
    company.cAddress2,
    company.cPostcode,
    company.cCity,
    company.cState,
  ]
    .filter(Boolean)
    .join(", ");

  const contactItems = [
    company.cOfficeNo
      ? {
          label: "Office",
          value: company.cOfficeNo,
          href: phoneHref(company.cOfficeNo),
          icon: Building2,
        }
      : null,
    company.cOfficeTelNo
      ? {
          label: "Office mobile",
          value: company.cOfficeTelNo,
          href: phoneHref(company.cOfficeTelNo),
          icon: Phone,
        }
      : null,
    company.cOwnerTelNo
      ? {
          label: company.cOwner || "Gallery contact",
          value: company.cOwnerTelNo,
          href: phoneHref(company.cOwnerTelNo),
          icon: Phone,
        }
      : null,
    company.cOfficeEmail
      ? {
          label: "General enquiries",
          value: company.cOfficeEmail,
          href: `mailto:${company.cOfficeEmail}`,
          icon: Mail,
        }
      : null,
    company.cOwnerEmail
      ? {
          label: "Direct enquiries",
          value: company.cOwnerEmail,
          href: `mailto:${company.cOwnerEmail}`,
          icon: Mail,
        }
      : null,
  ].filter(Boolean);

  return (
    <main className="pb-20 pt-10 text-stone-950">
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-rose-700">
            Contact Deltric Art
          </p>
          <h1 className="prata-regular mt-5 text-5xl leading-tight sm:text-6xl lg:text-7xl">
            Let&apos;s find the right piece for your space.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-stone-600">
            Speak with our team about artwork selection, framing, display advice,
            project sourcing, or arranging a gallery visit.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {company.cOfficeEmail ? (
              <a
                href={`mailto:${company.cOfficeEmail}?subject=Artwork%20enquiry`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
              >
                Email Us
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <Link
              to="/products"
              className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-950 transition hover:border-stone-950"
            >
              Browse Products
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-stone-100">
          <img
            src={assets.contact_img}
            alt="Deltric Art gallery consultation"
            className="h-[360px] w-full object-cover sm:h-[480px]"
          />
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg bg-[#f4f1ec] p-7 sm:p-9">
          <MapPin className="h-7 w-7 text-rose-700" strokeWidth={1.7} aria-hidden="true" />
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
            Visit the gallery
          </p>
          <h2 className="prata-regular mt-3 text-3xl sm:text-4xl">{company.cName}</h2>
          <p className="mt-5 max-w-lg text-base leading-8 text-stone-600">{address}</p>
          <p className="mt-6 text-sm leading-7 text-stone-500">
            Contact the studio before visiting so our team can prepare the most
            relevant artwork and framing options for you.
          </p>
        </article>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contactItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={`${item.label}-${item.value}`}
                href={item.href}
                className="group flex min-w-0 items-start gap-4 rounded-lg border border-stone-200 bg-white p-5 transition hover:border-stone-950"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-800 transition group-hover:bg-stone-950 group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 pt-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    {item.label}
                  </span>
                  <span className="mt-2 block break-words text-sm font-semibold text-stone-900 sm:text-base">
                    {item.value}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Contact;
