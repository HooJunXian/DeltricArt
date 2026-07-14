import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const toastStyles = {
  success: {
    icon: CheckCircle2,
    title: "Success",
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-950",
    iconWrap: "bg-emerald-600 text-white",
    close: "text-emerald-800 hover:bg-emerald-100",
    bar: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    title: "Something went wrong",
    wrapper: "border-rose-200 bg-rose-50 text-rose-950",
    iconWrap: "bg-rose-600 text-white",
    close: "text-rose-800 hover:bg-rose-100",
    bar: "bg-rose-500",
  },
};

function ToastAlert({ toast, onClose }) {
  useEffect(() => {
    if (!toast || !onClose) return undefined;

    const timer = window.setTimeout(() => {
      onClose();
    }, toast.duration || 3200);

    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const style = toastStyles[toast.type] || toastStyles.success;
  const Icon = style.icon;

  return (
    <div className="fixed right-4 top-24 z-[80] w-[calc(100vw-2rem)] max-w-sm sm:right-6">
      <div
        className={`relative overflow-hidden border shadow-[0_20px_55px_rgba(15,23,42,0.16)] backdrop-blur ${style.wrapper}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex gap-3 p-4 pr-12">
          <div className={`grid h-10 w-10 shrink-0 place-items-center ${style.iconWrap}`}>
            <Icon size={20} strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">{toast.title || style.title}</p>
            <p className="mt-1 text-sm leading-5 opacity-80">{toast.message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center transition ${style.close}`}
          aria-label="Close alert"
        >
          <X size={16} />
        </button>

        <div className={`h-1 w-full ${style.bar}`} />
      </div>
    </div>
  );
}

export default ToastAlert;
