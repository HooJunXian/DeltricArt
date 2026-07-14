import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Save, Upload, X } from "lucide-react";

import api from "../../api";
import ToastAlert from "../../components/ToastAlert";
import AdminSectionShell from "../components/AdminSectionShell";
import {
  buttonClass,
  formatFieldMessages,
  getApiErrorMessage,
  inputClass,
} from "../catalogUi";

const emptyCompany = {
  cName: "",
  cAddress1: "",
  cAddress2: "",
  cPostcode: "",
  cCity: "",
  cState: "",
  cOfficeNo: "",
  cOfficeTelNo: "",
  cOwner: "",
  cOwnerTelNo: "",
  cOfficeEmail: "",
  cOwnerEmail: "",
  cLogo: "",
};

const allowedLogoTypes = ["image/jpeg", "image/png"];
const maxLogoSize = 5 * 1024 * 1024;

const fieldGroups = [
  {
    title: "Company",
    fields: [
      { key: "cName", label: "Company name" },
      { key: "cOfficeEmail", label: "Office email", type: "email" },
      { key: "cOfficeNo", label: "Office no." },
      { key: "cOfficeTelNo", label: "Office telephone no." },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "cAddress1", label: "Address 1", wide: true },
      { key: "cAddress2", label: "Address 2", wide: true },
      { key: "cPostcode", label: "Postcode" },
      { key: "cCity", label: "City" },
      { key: "cState", label: "State" },
    ],
  },
  {
    title: "Owner",
    fields: [
      { key: "cOwner", label: "Owner name" },
      { key: "cOwnerTelNo", label: "Owner telephone no." },
      { key: "cOwnerEmail", label: "Owner email", type: "email" },
    ],
  },
];

const CompanySettingsPage = () => {
  const [company, setCompany] = useState(emptyCompany);
  const [postcodeMatches, setPostcodeMatches] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const logoInputRef = useRef(null);

  const cityOptions = useMemo(
    () => [...new Set(postcodeMatches.map((item) => item.pCity).filter(Boolean))],
    [postcodeMatches],
  );

  const stateOptions = useMemo(() => {
    const matchesForCity = company.cCity
      ? postcodeMatches.filter((item) => item.pCity === company.cCity)
      : postcodeMatches;

    return [...new Set(matchesForCity.map((item) => item.pState).filter(Boolean))];
  }, [company.cCity, postcodeMatches]);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setToast(null);

    try {
      const response = await api.get("/api/admin/company/");
      setCompany({ ...emptyCompany, ...response.data });
      setLogoPreview(response.data?.cLogo || "");
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(error, "Unable to load company details."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  useEffect(() => {
    if (!logoFile) return undefined;

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  const handleLogoSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedLogoTypes.includes(file.type)) {
      setToast({
        type: "error",
        message: "Logo must be a JPG, JPEG, or PNG image.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > maxLogoSize) {
      setToast({
        type: "error",
        message: "Logo file size must not be more than 5MB.",
      });
      event.target.value = "";
      return;
    }

    setLogoFile(file);
  };

  useEffect(() => {
    const postcode = company.cPostcode.trim();
    if (postcode.length < 3) {
      setPostcodeMatches([]);
      return undefined;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await api.get(`/api/postcodes/?postcode=${encodeURIComponent(postcode)}`);
        if (ignore) return;

        const matches = response.data || [];
        setPostcodeMatches(matches);

        if (!matches.length) return;

        const cityList = [...new Set(matches.map((item) => item.pCity).filter(Boolean))];
        const stateList = [...new Set(matches.map((item) => item.pState).filter(Boolean))];
        setCompany((current) => ({
          ...current,
          cCity: cityList.includes(current.cCity) ? current.cCity : cityList[0] || current.cCity,
          cState: stateList.includes(current.cState) ? current.cState : stateList[0] || current.cState,
        }));
      } catch {
        if (!ignore) {
          setPostcodeMatches([]);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [company.cPostcode]);

  const renderCompanyField = (field) => {
    const commonProps = {
      className: `${inputClass} mt-2`,
      value: company[field.key] || "",
      onChange: (event) =>
        setCompany((current) => ({
          ...current,
          [field.key]: event.target.value,
        })),
    };

    if (field.key === "cPostcode") {
      return (
        <>
          <input {...commonProps} type="text" />
          {company.cPostcode.trim().length >= 3 && postcodeMatches.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              No postcode match found. City and state can still be entered manually.
            </p>
          ) : null}
        </>
      );
    }

    if (field.key === "cCity") {
      return (
        <select {...commonProps}>
          {cityOptions.length ? null : <option value=""></option>}
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      );
    }

    if (field.key === "cState") {
      return (
        <select {...commonProps}>
          {stateOptions.length ? null : <option value=""></option>}
          {stateOptions.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      );
    }

    return <input {...commonProps} type={field.type || "text"} />;
  };

  const saveCompany = async (event) => {
    event.preventDefault();
    setToast(null);

    const errors = {};
    if (!company.cName.trim()) {
      errors.cName = "Please enter the company name.";
    }

    if (Object.keys(errors).length) {
      setToast({
        type: "error",
        title: "Check company details",
        message: formatFieldMessages(errors),
      });
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(company).forEach(([key, value]) => {
        payload.append(key, value || "");
      });
      if (logoFile) {
        payload.append("cLogoFile", logoFile);
      }

      const response = await api.put("/api/admin/company/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCompany({ ...emptyCompany, ...response.data });
      setLogoFile(null);
      setLogoPreview(response.data?.cLogo || "");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      setToast({
        type: "success",
        message: "Company details saved successfully.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(error, "Unable to save company details."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSectionShell
      eyebrow="Setup"
      title="Company details"
      description="Maintain the single company profile used by storefront contact areas such as the footer."
    >
      <ToastAlert toast={toast} onClose={() => setToast(null)} />

      <section className="border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(28,25,23,0.06)]">
        {loading ? (
          <div className="text-sm text-stone-500">Loading company details...</div>
        ) : (
          <form onSubmit={saveCompany} noValidate className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
                Website icon
              </h2>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-24 w-24 items-center justify-center border border-stone-200 bg-stone-50 text-stone-400">
                  {logoPreview ? (
                    <img alt="" className="h-full w-full object-contain p-2" src={logoPreview} />
                  ) : (
                    <Building2 className="h-8 w-8" strokeWidth={1.6} />
                  )}
                </div>
                <div>
                  <input
                    ref={logoInputRef}
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                    type="file"
                    onChange={handleLogoSelection}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={buttonClass}
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" strokeWidth={1.8} />
                      Select Logo
                    </button>
                    {logoFile ? (
                      <button
                        className="inline-flex items-center justify-center gap-2 border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(company.cLogo || "");
                          if (logoInputRef.current) {
                            logoInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-4 w-4" strokeWidth={1.8} />
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Upload one JPG, JPEG, or PNG logo. Maximum file size is 5MB.
                  </p>
                </div>
              </div>
            </section>

            {fieldGroups.map((group) => (
              <section key={group.title}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {group.title}
                </h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.fields.map((field) => (
                    <label
                      key={field.key}
                      className={field.wide ? "block md:col-span-2 xl:col-span-3" : "block"}
                    >
                      <span className="text-sm font-medium text-stone-700">{field.label}</span>
                      {renderCompanyField(field)}
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <button className={buttonClass} type="submit" disabled={saving}>
              <Save className="h-4 w-4" strokeWidth={1.8} />
              {saving ? "Saving..." : "Save Company Details"}
            </button>
          </form>
        )}
      </section>
    </AdminSectionShell>
  );
};

export default CompanySettingsPage;
