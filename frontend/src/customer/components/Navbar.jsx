import React, { useContext, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { assets } from "../../assets/assets";
import { ShopContext } from "../context/shop-context";

const Navbar = () => {
  const [visible, setVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { cartCount, company, user, logout, openAuthModal } = useContext(ShopContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  const isHome = location.pathname === "/";
  const isTransparent = isHome && !isScrolled && !visible;
  const navTheme = isTransparent
    ? "bg-transparent text-white"
    : "bg-white/95 text-gray-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md";
  const iconStyle = isTransparent ? "brightness-0 invert" : "";
  const badgeStyle = isTransparent ? "bg-white text-black" : "bg-black text-white";
  const accountButtonStyle = isTransparent
    ? "border-white/70 text-white hover:bg-white hover:text-black"
    : "border-gray-300 text-gray-700 hover:border-black hover:text-black";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    [
      "flex flex-col items-center gap-1 transition-colors duration-300",
      isTransparent ? "text-white/90 hover:text-white" : "text-gray-700 hover:text-black",
      isActive ? "font-semibold" : "",
    ].join(" ");

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`transition-all duration-300 ${navTheme}`}>
        <div className="mx-auto flex h-[84px] items-center justify-between px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
          <Link to="/">
            <img
              src={company?.cLogo || assets.logo}
              className={`w-36 transition duration-300 sm:w-44 ${iconStyle}`}
              alt={company?.cName || "Deltric Art Gallery"}
            />
          </Link>

          <ul className="hidden gap-6 text-sm sm:flex">
            <NavLink to="/" className={navLinkClass}>
              <p>HOME</p>
              <hr
                className={`h-[1.5px] w-2/4 border-none ${
                  isTransparent ? "bg-white" : "bg-gray-700"
                } hidden`}
              />
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              <p>PRODUCTS</p>
              <hr
                className={`h-[1.5px] w-2/4 border-none ${
                  isTransparent ? "bg-white" : "bg-gray-700"
                } hidden`}
              />
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              <p>ABOUT</p>
              <hr
                className={`h-[1.5px] w-2/4 border-none ${
                  isTransparent ? "bg-white" : "bg-gray-700"
                } hidden`}
              />
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              <p>CONTACT</p>
              <hr
                className={`h-[1.5px] w-2/4 border-none ${
                  isTransparent ? "bg-white" : "bg-gray-700"
                } hidden`}
              />
            </NavLink>
            <NavLink to="/admin" className={navLinkClass}>
              <p>ADMIN</p>
              <hr
                className={`h-[1.5px] w-2/4 border-none ${
                  isTransparent ? "bg-white" : "bg-gray-700"
                } hidden`}
              />
            </NavLink>
          </ul>

          <div className="flex items-center gap-4 sm:gap-6">
            <img
              src={assets.search_icon}
              className={`hidden w-5 cursor-pointer transition duration-300 sm:block ${iconStyle}`}
              alt="Search"
            />
            {user ? (
              <div className="group relative hidden sm:block">
                <button
                  type="button"
                  className={`flex max-w-36 items-center gap-2 truncate border px-3 py-2 text-sm font-medium transition ${accountButtonStyle}`}
                >
                  <img
                    src={assets.profile_icon}
                    className={`w-5 transition duration-300 ${iconStyle}`}
                    alt=""
                  />
                  <span className="hidden max-w-20 truncate md:inline">{user.username}</span>
                </button>
                <div className="absolute right-0 hidden pt-4 group-hover:block">
                  <div className="flex w-40 flex-col gap-2 bg-white px-5 py-4 text-sm text-gray-600 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                    <p className="font-medium text-black">{user.username}</p>
                    <Link className="hover:text-black" to="/purchase">
                      My Purchase
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-left hover:text-black"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className={`hidden border px-4 py-2 text-sm font-medium transition sm:inline-flex ${accountButtonStyle}`}
              >
                Login
              </button>
            )}
            <Link to="/cart" className="relative">
              <img
                src={assets.cart_icon}
                className={`w-5 min-w-5 transition duration-300 ${iconStyle}`}
                alt="Cart"
              />
              <p
                className={`absolute bottom-[-5px] right-[-5px] w-4 rounded-full text-center text-[8px] leading-4 ${badgeStyle}`}
              >
                {cartCount}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="grid h-10 w-10 place-items-center sm:hidden"
              aria-label="Open menu"
              aria-expanded={visible}
            >
              <img
                src={assets.menu_icon}
                className={`w-5 transition duration-300 ${iconStyle}`}
                alt=""
              />
            </button>
          </div>
        </div>

        <div className={`fixed inset-0 z-[60] sm:hidden ${visible ? "pointer-events-auto" : "pointer-events-none"}`}>
          <button
            type="button"
            className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setVisible(false)}
            aria-label="Close menu overlay"
          />

          <aside
            className={`absolute right-0 top-0 flex h-dvh w-[min(84vw,360px)] flex-col bg-white text-gray-700 shadow-[-18px_0_48px_rgba(15,23,42,0.2)] transition-transform duration-300 ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Menu</p>
                <p className="mt-1 text-sm font-semibold text-stone-950">
                  {user ? user.username : "Guest"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="grid h-10 w-10 place-items-center border border-stone-200"
                aria-label="Close menu"
              >
                <img className="h-4 rotate-180" src={assets.dropdown_icon} alt="" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/"
              >
                HOME
              </NavLink>
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/products"
              >
                PRODUCTS
              </NavLink>
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/about"
              >
                ABOUT
              </NavLink>
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/contact"
              >
                CONTACT
              </NavLink>
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/cart"
              >
                CART ({cartCount})
              </NavLink>
              <NavLink
                onClick={() => setVisible(false)}
                className="border-b border-stone-200 py-4 text-sm font-medium"
                to="/admin"
              >
                ADMIN
              </NavLink>
            </nav>

            <div className="border-t border-stone-200 p-5">
              {user ? (
                <div className="grid gap-3">
                  <NavLink
                    onClick={() => setVisible(false)}
                    className="w-full border border-stone-300 px-4 py-3 text-center text-sm font-semibold text-stone-950"
                    to="/purchase"
                  >
                    My Purchase
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setVisible(false);
                      handleLogout();
                    }}
                    className="w-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setVisible(false);
                    openAuthModal("login");
                  }}
                  className="block w-full bg-stone-950 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Login
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
