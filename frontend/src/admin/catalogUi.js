export const emptyCategory = {
  parent: "",
  name: "",
  description: "",
  active: true,
};

export const emptyProduct = {
  code: "",
  name: "",
  category: "",
  description: "",
  price: "",
  stock_balance: "",
  image: "",
  active: true,
};

export const statusOptions = [
  { label: "All", value: "" },
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

export const inputClass =
  "w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-950";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 border border-stone-950 bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-300";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50";

export const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center border border-stone-300 bg-white p-0 text-stone-800 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50";

export const dangerIconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center border border-stone-300 bg-white p-0 text-stone-800 transition hover:border-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50";

export const actionIconProps = {
  size: 18,
  strokeWidth: 2,
  style: {
    display: "block",
    width: "18px",
    height: "18px",
    minWidth: "18px",
    minHeight: "18px",
    flexShrink: 0,
  },
};

export const formatFieldMessages = (errors) =>
  Object.values(errors)
    .filter(Boolean)
    .join(" ");

export const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  const data = error.response?.data;

  if (!data) {
    return error.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  const fieldErrors = data.errors || data;
  if (fieldErrors && typeof fieldErrors === "object" && !Array.isArray(fieldErrors)) {
    return Object.values(fieldErrors).flat().filter(Boolean).join(" ");
  }

  return fallback;
};
