import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import ErrorAlert from "../components/ErrorAlert";
import { ShopContext } from "../customer/context/shop-context";

const createValidationError = (errors) => ({
  response: {
    data: { errors },
  },
});

function AdminLogin() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setAuthTokens, loadCurrentUser } = useContext(ShopContext);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = {};
    if (!formData.username.trim()) errors.username = "Please enter your username.";
    if (!formData.password) errors.password = "Please enter your password.";

    if (Object.keys(errors).length) {
      setError(createValidationError(errors));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/admin/login/", formData);
      setAuthTokens(response.data.access, response.data.refresh);
      await loadCurrentUser();
      navigate("/admin");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-4 py-10">
      <section className="w-full max-w-md border border-stone-200 bg-white p-7 shadow-[0_24px_70px_rgba(31,41,55,0.12)] sm:p-9">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
          Staff Portal
        </p>
        <h1 className="prata-regular mt-3 text-4xl text-stone-950">Admin Login</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Sign in with a staff or administrator account to manage the store.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Username</span>
            <input
              className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <input
              className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </label>

          <button
            className="w-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <ErrorAlert error={error} />
        </form>

        <Link
          className="mt-6 inline-block text-sm font-semibold text-stone-950 underline-offset-4 hover:underline"
          to="/"
        >
          Back to storefront
        </Link>
      </section>
    </main>
  );
}

export default AdminLogin;
