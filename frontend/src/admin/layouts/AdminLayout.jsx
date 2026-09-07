import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Menu, PanelLeftClose, UserCircle, X } from "lucide-react";

import api from "../../api";
import { assets } from "../../assets/assets";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../constants";
import AdminMenu from "../components/AdminMenu";
import { adminPageNames } from "../navigation";

const getPageName = (pathname) => {
  if (/^\/admin\/(catalog|inventory)\/products\/[^/]+\/edit$/.test(pathname)) return "Edit product";
  return adminPageNames[pathname] || "Admin";
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [company, setCompany] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const [dashboardResponse, companyResponse, userResponse] = await Promise.all([
          api.get("/api/admin/dashboard/"),
          api.get("/api/company/"),
          api.get("/api/me/"),
        ]);
        if (!ignore) {
          setDashboard(dashboardResponse.data);
          setCompany(companyResponse.data?.cName ? companyResponse.data : null);
          setUser(userResponse.data);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.status === 403
              ? "You need a staff or admin account to view this dashboard."
              : "Unable to load admin data right now.",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => setMobileSidebarOpen(false), [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/admin/login");
  };

  const sidebarClass = [
    "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-stone-950 text-white transition-transform duration-200",
    mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
    desktopSidebarOpen ? "lg:translate-x-0" : "lg:-translate-x-full",
  ].join(" ");

  return (
    <div className="min-h-screen bg-[#f5f3ef] text-stone-950">
      {mobileSidebarOpen ? (
        <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-stone-950/45 lg:hidden" onClick={() => setMobileSidebarOpen(false)} type="button" />
      ) : null}

      <aside className={sidebarClass}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <Link className="flex min-w-0 flex-1 items-center gap-3" to="/admin">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
              <img alt="" className="h-full w-full object-contain" src={company?.cLogo || assets.logo} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{company?.cName || "DeltricArt"}</p>
              <p className="text-xs text-stone-400">Admin workspace</p>
            </div>
          </Link>
          <button
            aria-label="Close sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white/10 hover:text-white"
            onClick={() => {
              setMobileSidebarOpen(false);
              setDesktopSidebarOpen(false);
            }}
            type="button"
          >
            <X className="h-5 w-5 lg:hidden" />
            <PanelLeftClose className="hidden h-5 w-5 lg:block" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminMenu onNavigate={() => setMobileSidebarOpen(false)} />
        </div>

        <div className="space-y-2 border-t border-white/10 p-3">
          <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-300 transition hover:bg-white/8 hover:text-white" to="/">
            <ExternalLink className="h-4 w-4" />
            View storefront
          </Link>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-300 transition hover:bg-white/8 hover:text-white" onClick={handleLogout} type="button">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-[margin] duration-200 ${desktopSidebarOpen ? "lg:ml-64" : "lg:ml-0"}`}>
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Toggle navigation"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
                onClick={() => {
                  if (window.innerWidth >= 1024) setDesktopSidebarOpen((current) => !current);
                  else setMobileSidebarOpen(true);
                }}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-500">Admin / {getPageName(location.pathname)}</p>
                <p className="truncate text-sm font-semibold text-stone-950">{getPageName(location.pathname)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <UserCircle className="h-5 w-5 text-stone-500" strokeWidth={1.8} />
              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-stone-900">{user?.username || "Admin"}</p>
                <p className="text-xs text-stone-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <Outlet context={{ dashboard, loading, error }} />
      </div>
    </div>
  );
};

export default AdminLayout;
