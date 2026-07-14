import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { assets } from "../../assets/assets";
import { ShopContext } from "../context/shop-context";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "All Products", to: "/products" },
  { label: "Oil Painting", to: "/products?type=Oil%20Painting" },
  { label: "Sculpture", to: "/products?category=Sculpture" },
  { label: "Printing", to: "/products?type=Printing" },
  { label: "Frame", to: "/products?type=Frame" },
  { label: "Contact Us", to: "/contact" },
];

const importantLinks = [
  { label: "Shipping Details", to: "/place-order" },
  { label: "Admin Dashboard", to: "/admin" },
  { label: "FAQ", to: "/contact" },
];

const defaultCompany = {
  cName: "DeltricArt",
  cAddress1: "No.5-02, Jalan Kenari 17f",
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

const socialLinks = [
  { label: "Facebook", text: "f", href: "https://www.facebook.com/" },
  { label: "Instagram", text: "ig", href: "https://www.instagram.com/" },
];

const Footer = () => {
  const year = new Date().getFullYear();
  const { company: loadedCompany } = useContext(ShopContext);
  const company = useMemo(
    () => ({ ...defaultCompany, ...(loadedCompany?.cName ? loadedCompany : {}) }),
    [loadedCompany],
  );

  const contactItems = useMemo(() => {
    const address = [
      company.cAddress1,
      company.cAddress2,
      company.cPostcode,
      company.cCity,
      company.cState,
    ]
      .filter(Boolean)
      .join(", ");

    return [
      address ? { label: address, icon: MapPin } : null,
      company.cOfficeNo ? { label: `${company.cOfficeNo} (Office)`, icon: Building2 } : null,
      company.cOfficeTelNo ? { label: `${company.cOfficeTelNo} (Office H/P)`, icon: Phone } : null,
      company.cOwnerTelNo
        ? { label: `${company.cOwnerTelNo}${company.cOwner ? ` (${company.cOwner})` : ""}`, icon: Phone }
        : null,
      company.cOfficeEmail
        ? { label: company.cOfficeEmail, href: `mailto:${company.cOfficeEmail}`, icon: Mail }
        : null,
      company.cOwnerEmail
        ? { label: company.cOwnerEmail, href: `mailto:${company.cOwnerEmail}`, icon: Mail }
        : null,
    ].filter(Boolean);
  }, [company]);

  return (
    <footer className="bg-[#292929] text-stone-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.7fr_0.75fr_0.75fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={company.cLogo || assets.logo}
                alt={`${company.cName || "DeltricArt"} logo`}
                className="h-12 w-auto brightness-0 invert"
              />
            </Link>

            <h2 className="mt-7 text-base font-semibold text-white">
              Get in Touch with Us for the Best Quality Interior Decor
            </h2>

            <div className="mt-7 space-y-4">
              {contactItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 flex-none text-white"
                      strokeWidth={1.8}
                    />
                    <span>{item.label}</span>
                  </>
                );

                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex max-w-2xl items-start gap-4 text-sm leading-6 text-stone-300 transition hover:text-white sm:text-base"
                  >
                    {content}
                  </a>
                ) : (
                  <p
                    key={item.label}
                    className="flex max-w-2xl items-start gap-4 text-sm leading-6 text-stone-300 sm:text-base"
                  >
                    {content}
                  </p>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Quick Links</h3>
            <nav className="mt-6 flex flex-col gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm text-stone-300 transition hover:text-white sm:text-base"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Important Links</h3>
            <nav className="mt-6 flex flex-col gap-4">
              {importantLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm text-stone-300 transition hover:text-white sm:text-base"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-8 flex items-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-lg font-semibold text-white transition hover:border-white hover:bg-white hover:text-stone-900"
                >
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} {company.cName || "DeltricArt"}. All rights reserved.</p>
          <p>Oil painting, sculpture, printing and frame decor.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
