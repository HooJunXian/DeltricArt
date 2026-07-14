import { useEffect, useState } from "react";
import { X } from "lucide-react";

import api from "../../api";
import ErrorAlert from "../../components/ErrorAlert";

const PHONE_CODES = [
  { countryCode: "MY", label: "MY", value: "60" },
  { countryCode: "SG", label: "SG", value: "65" },
  { countryCode: "US", label: "US", value: "1" },
];

const createValidationError = (errors) => ({
  response: {
    data: { errors },
  },
});

const initialRegisterForm = {
  username: "",
  email: "",
  mobile_country_code: "60",
  mobile: "",
  country_id: "",
  password: "",
  confirm_password: "",
};

function MemberAuthModal({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onAuthenticated,
}) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [countries, setCountries] = useState([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const isRegister = mode === "register";

  useEffect(() => {
    if (!isOpen) return undefined;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isRegister || countries.length || countryLoading) return undefined;

    let isMounted = true;
    setCountryLoading(true);

    const loadCountries = async () => {
      try {
        const response = await api.get("/api/countries/");
        if (!isMounted) return;

        setCountries(response.data);
        if (response.data.length) {
          setRegisterForm((current) => ({
            ...current,
            country_id: current.country_id || String(response.data[0].id),
          }));
        }
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setCountryLoading(false);
      }
    };

    loadCountries();

    return () => {
      isMounted = false;
    };
  }, [countries.length, countryLoading, isOpen, isRegister]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage("");
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "country_id") {
        const selectedCountry = countries.find((country) => String(country.id) === value);
        const matchingPhoneCode = PHONE_CODES.find(
          (phoneCode) => phoneCode.countryCode === selectedCountry?.code
        );

        if (matchingPhoneCode) {
          next.mobile_country_code = matchingPhoneCode.value;
        }
      }

      return next;
    });
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = {};
    if (!loginForm.username.trim()) errors.username = "Please enter your username.";
    if (!loginForm.password) errors.password = "Please enter your password.";

    if (Object.keys(errors).length) {
      setError(createValidationError(errors));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/member/login/", loginForm);
      await onAuthenticated(response.data.access, response.data.refresh);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage("");

    const errors = {};
    if (!registerForm.username.trim()) errors.username = "Please choose a username.";
    if (!registerForm.email.trim()) errors.email = "Please enter your email address.";
    if (!registerForm.mobile.trim()) errors.mobile = "Please enter your mobile number.";
    if (!registerForm.country_id) errors.country = "Please select your country.";
    if (!registerForm.password) errors.password = "Please create a password.";
    if (!registerForm.confirm_password) {
      errors.confirm_password = "Please confirm your password.";
    } else if (registerForm.password !== registerForm.confirm_password) {
      errors.confirm_password = "Password and confirm password must match.";
    }

    if (Object.keys(errors).length) {
      setError(createValidationError(errors));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/member/register/", registerForm);
      setSuccessMessage(response.data.message);
      setRegisterForm(initialRegisterForm);
      onModeChange("login");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close member login"
      />

      <section className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Member Account
            </p>
            <h2 className="prata-regular mt-2 text-3xl text-stone-950">
              {isRegister ? "Create Account" : "Login"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center border border-stone-200 text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {isRegister ? (
          <form onSubmit={handleRegisterSubmit} noValidate className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Username</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="text"
                name="username"
                value={registerForm.username}
                onChange={handleRegisterChange}
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Mobile</span>
              <div className="mt-2 flex border border-stone-300 transition focus-within:border-stone-950">
                <select
                  className="w-28 border-r border-stone-300 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-800 outline-none"
                  name="mobile_country_code"
                  value={registerForm.mobile_country_code}
                  onChange={handleRegisterChange}
                  aria-label="Mobile country code"
                >
                  {PHONE_CODES.map((phoneCode) => (
                    <option key={phoneCode.value} value={phoneCode.value}>
                      {phoneCode.label} +{phoneCode.value}
                    </option>
                  ))}
                </select>
                <input
                  className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
                  type="tel"
                  name="mobile"
                  value={registerForm.mobile}
                  onChange={handleRegisterChange}
                  autoComplete="tel-national"
                  inputMode="numeric"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Country</span>
              <select
                className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                name="country_id"
                value={registerForm.country_id}
                onChange={handleRegisterChange}
                disabled={countryLoading || !countries.length}
              >
                {countries.length ? (
                  countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </option>
                  ))
                ) : (
                  <option value="">No countries available</option>
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Password</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="password"
                name="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Confirm Password</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="password"
                name="confirm_password"
                value={registerForm.confirm_password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                className="w-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                type="submit"
                disabled={loading || countryLoading || !countries.length}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} noValidate className="mt-7 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Username</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="text"
                name="username"
                value={loginForm.username}
                onChange={handleLoginChange}
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Password</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
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
          </form>
        )}

        {successMessage ? (
          <p className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-5">
          <ErrorAlert error={error} />
        </div>

        <p className="mt-6 text-sm text-stone-600">
          {isRegister ? "Already registered?" : "New here?"}{" "}
          <button
            type="button"
            className="font-semibold text-stone-950 underline-offset-4 hover:underline"
            onClick={() => onModeChange(isRegister ? "login" : "register")}
          >
            {isRegister ? "Login instead" : "Create an account"}
          </button>
        </p>
      </section>
    </div>
  );
}

export default MemberAuthModal;
