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

function Login() {
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

    if (!formData.username.trim()) {
      errors.username = "Please enter your username.";
    }

    if (!formData.password) {
      errors.password = "Please enter your password.";
    }

    if (Object.keys(errors).length) {
      setError(createValidationError(errors));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/token/", formData);
      setAuthTokens(response.data.access, response.data.refresh);
      const currentUser = await loadCurrentUser();
      navigate(currentUser?.is_staff || currentUser?.is_superuser ? "/admin" : "/");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f7f4ef] px-4 py-12 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
      <section className="mx-auto grid max-w-5xl overflow-hidden border border-stone-200 bg-white shadow-[0_24px_70px_rgba(31,41,55,0.12)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-[url('/src/assets/about_img.png')] bg-cover bg-center md:block" />

        <div className="px-6 py-10 sm:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Welcome back</p>
          <h1 className="prata-regular mt-3 text-4xl text-stone-950">Login</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">
            Access your account to continue shopping and review your orders.
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

          <p className="mt-6 text-sm text-stone-600">
            New here?{" "}
            <Link className="font-semibold text-stone-950 underline-offset-4 hover:underline" to="/register">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
