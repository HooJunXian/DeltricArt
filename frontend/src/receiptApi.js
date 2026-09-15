import api from "./api";

const fetchReceiptPdf = (orderNumber, admin) => {
  const endpoint = admin
    ? `/api/admin/orders/${orderNumber}/receipt/`
    : `/api/orders/${orderNumber}/receipt/`;
  return api.get(endpoint, { responseType: "blob" });
};

export const downloadReceiptPdf = async (orderNumber, { admin = false } = {}) => {
  const response = await fetchReceiptPdf(orderNumber, admin);
  const objectUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = getReceiptFilename(response.headers["content-disposition"], orderNumber);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
};

export const printReceiptPdf = async (orderNumber) => {
  const response = await fetchReceiptPdf(orderNumber, false);
  const objectUrl = window.URL.createObjectURL(response.data);
  const frame = document.createElement("iframe");
  frame.title = "Receipt print preview";
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    frame.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  await new Promise((resolve, reject) => {
    frame.addEventListener(
      "load",
      () => {
        try {
          const printWindow = frame.contentWindow;
          if (!printWindow) throw new Error("Receipt print window is unavailable.");
          printWindow.addEventListener("afterprint", cleanup, { once: true });
          printWindow.focus();
          printWindow.print();
          window.setTimeout(cleanup, 60000);
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      },
      { once: true },
    );
    frame.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("Unable to load the receipt for printing."));
      },
      { once: true },
    );
    frame.src = objectUrl;
    document.body.appendChild(frame);
  });
};

const getReceiptFilename = (contentDisposition, orderNumber) => {
  const match = String(contentDisposition || "").match(/filename="?([^";]+)"?/i);
  return match?.[1] || `receipt-${orderNumber}.pdf`;
};
