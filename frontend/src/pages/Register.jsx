import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import ErrorAlert from "../components/ErrorAlert";

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

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    mobile_country_code: "60",
    mobile: "",
    country_id: "",
    password: "",
    confirm_password: "",
  });
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [countryLoading, setCountryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadCountries = async () => {
      try {
        const response = await api.get("/api/countries/");
        if (isMounted) {
          setCountries(response.data);
          if (response.data.length) {
            setFormData((current) => ({
              ...current,
              country_id: String(response.data[0].id),
            }));
          }
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
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => {
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage("");

    const errors = {};

    if (!formData.username.trim()) {
      errors.username = "Please choose a username.";
    }

    if (!formData.email.trim()) {
      errors.email = "Please enter your email address.";
    }

    if (!formData.mobile.trim()) {
      errors.mobile = "Please enter your mobile number.";
    }

    if (!formData.country_id) {
      errors.country = "Please select your country.";
    }

    if (!formData.password) {
      errors.password = "Please create a password.";
    }

    if (!formData.confirm_password) {
      errors.confirm_password = "Please confirm your password.";
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = "Password and confirm password must match.";
    }

    if (Object.keys(errors).length) {
      setError(createValidationError(errors));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/register/", formData);
      setSuccessMessage(response.data.message);
      window.setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f7f4ef] px-4 py-12 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
      <section className="mx-auto grid max-w-6xl overflow-hidden border border-stone-200 bg-white shadow-[0_24px_70px_rgba(31,41,55,0.12)] lg:grid-cols-[0.85fr_1.15fr]">
        <div className="hidden bg-[url('/src/assets/contact_img.png')] bg-cover bg-center lg:block" />

        <div className="px-6 py-10 sm:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Start collecting</p>
          <h1 className="prata-regular mt-3 text-4xl text-stone-950">Create Account</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Register once, then keep your profile ready for checkout and order updates.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
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
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Mobile</span>
              <div className="mt-2 flex border border-stone-300 transition focus-within:border-stone-950">
                <select
                  className="w-28 border-r border-stone-300 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-800 outline-none"
                  name="mobile_country_code"
                  value={formData.mobile_country_code}
                  onChange={handleChange}
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
                  value={formData.mobile}
                  onChange={handleChange}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  placeholder="123456789"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Country</span>
              <select
                className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                name="country_id"
                value={formData.country_id}
                onChange={handleChange}
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
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Confirm Password</span>
              <input
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
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

            {successMessage ? (
              <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
                {successMessage}
              </p>
            ) : null}

            <div className="sm:col-span-2">
              <ErrorAlert error={error} />
            </div>
          </form>

          <p className="mt-6 text-sm text-stone-600">
            Already registered?{" "}
            <Link className="font-semibold text-stone-950 underline-offset-4 hover:underline" to="/login">
              Login instead
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
