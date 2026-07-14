import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Building2, LogOut, Store, UserCircle } from "lucide-react";

import api from "../../api";
import { assets } from "../../assets/assets";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../constants";
import AdminMenu from "../components/AdminMenu";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [company, setCompany] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          const message =
            err.response?.status === 403
              ? "You need a staff or admin account to view this dashboard."
              : "Unable to load admin data right now.";
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-4 py-3 sm:px-[5vw] md:px-[6vw] lg:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Link to="/admin" className="flex shrink-0 flex-col items-center gap-1.5 text-stone-950">
              <div className="flex h-14 w-36 items-center justify-center overflow-hidden text-stone-950 sm:w-44">
                {company?.cLogo ? (
                  <img
                    alt={company.cName || "Company logo"}
                    className="h-full w-full object-contain"
                    src={company.cLogo || assets.logo}
                  />
                ) : (
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                )}
              </div>
            </Link>

            <AdminMenu />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="group relative">
              <button
                type="button"
                className="inline-flex max-w-44 items-center gap-2 truncate rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
              >
                <UserCircle className="h-4 w-4" strokeWidth={1.8} />
                <span className="truncate">{user?.username || "Admin"}</span>
              </button>

              <div className="invisible absolute right-0 top-full z-50 w-48 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="border border-stone-200 bg-white p-3 text-sm shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                  <p className="truncate px-2 py-2 font-semibold text-stone-950">
                    {user?.username || "Admin"}
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-2 py-2 text-left text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.8} />
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
            >
              <Store className="h-4 w-4" strokeWidth={1.8} />
              Storefront
            </Link>
          </div>
        </div>
      </header>

      <Outlet context={{ dashboard, loading, error }} />
    </div>
  );
};

export default AdminLayout;
