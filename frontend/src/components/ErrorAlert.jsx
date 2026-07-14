function ErrorAlert({ error }) {
  if (!error) return null;
  if (typeof error === "string") {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const responseData = error?.response?.data;
  const fieldErrors = responseData?.errors || responseData;
  const fallbackStatus = error?.response?.status
    ? `Request failed with status ${error.response.status}`
    : null;

  const message =
    responseData?.message ||
    responseData?.detail ||
    responseData?.non_field_errors?.[0] ||
    (typeof responseData === "string" ? fallbackStatus : null) ||
    error?.message ||
    fallbackStatus ||
    "Something went wrong";

  if (fieldErrors && typeof fieldErrors === "object" && !Array.isArray(fieldErrors)) {
    const entries = Object.entries(fieldErrors).filter(([, value]) => Array.isArray(value) || value);

    if (entries.length) {
      return (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {entries.map(([field, value]) => (
            <p key={field}>
              <span className="font-semibold">{field.replaceAll("_", " ")}:</span>{" "}
              {Array.isArray(value) ? value.join(" ") : String(value)}
            </p>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export default ErrorAlert;
