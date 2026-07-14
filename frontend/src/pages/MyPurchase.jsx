import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import api from "../api";
import failedImage from "../assets/failed.png";
import successImage from "../assets/success.png";
import { ShopContext } from "../customer/context/shop-context";

const formatOrderMoney = (order, amount) => {
  const numeric = Number(amount || 0);
  return `${order?.currency_symbol || "RM"}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(numeric) ? 0 : numeric)}`;
};

const formatStatus = (value) =>
  ({
    PN: "Pending payment",
    SC: "Success",
    CN: "Cancelled",
  })[value] ||
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (date, time) => {
  if (!date && !time) return "-";
  if (!date) return time;

  const dateTime = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(dateTime.getTime())) {
    return [date, time].filter(Boolean).join(" ");
  }

  return dateTime.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: time ? "short" : undefined,
  });
};

const formatOrderDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const purchaseTabs = [
  { id: "all", label: "All", statuses: null },
  { id: "completed", label: "Completed", statuses: ["SC"] },
  { id: "cancelled", label: "Cancelled", statuses: ["CN"] },
  { id: "return_refund", label: "Return Refund", statuses: [] },
];

const getReceiptState = (order) => {
  if (order?.status === "SC" || order?.payment?.status === "paid") {
    return {
      image: successImage,
      label: "Payment Completed",
      title: "Thank you for your payment",
      message: "Your payment is confirmed and your order is being prepared.",
      tone: "emerald",
    };
  }

  if (order?.status === "CN" || order?.payment?.status === "failed") {
    return {
      image: failedImage,
      label: "Order Cancelled",
      title: "This order was cancelled",
      message: "The payment was not completed, so this order is marked as cancelled.",
      tone: "rose",
    };
  }

  return {
    image: successImage,
    label: "Order Received",
    title: "Your order has been submitted",
    message: "Payment is pending and our team can process this order manually.",
    tone: "stone",
  };
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3 text-sm">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </span>
      <span className="mt-1 block break-words font-medium leading-6 text-stone-950">
        {value || "-"}
      </span>
    </span>
  </div>
);

const MyPurchase = () => {
  const { orderNumber } = useParams();
  const { openAuthModal, showToast } = useContext(ShopContext);
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(purchaseTabs[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    setOrder(null);

    if (!orderNumber) {
      api
        .get("/api/orders/")
        .then((response) => {
          if (!ignore) setOrders(response.data || []);
        })
        .catch((requestError) => {
          if (ignore) return;
          const status = requestError.response?.status;
          const message =
            status === 401
              ? "Please login again to view your purchase history."
              : requestError.response?.data?.detail || "Unable to load your purchase history.";
          setError(message);
          showToast({
            type: "error",
            title: status === 401 ? "Login expired" : "Purchases not loaded",
            message,
          });
          if (status === 401) {
            openAuthModal("login");
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });

      return () => {
        ignore = true;
      };
    }

    api
      .get(`/api/orders/${orderNumber}/`)
      .then((response) => {
        if (!ignore) setOrder(response.data);
      })
      .catch((requestError) => {
        if (ignore) return;
        const status = requestError.response?.status;
        const message =
          status === 401
            ? "Please login again to view this receipt."
            : requestError.response?.data?.detail || "Unable to load this receipt.";
        setError(message);
        showToast({
          type: "error",
          title: status === 401 ? "Login expired" : "Receipt not loaded",
          message,
        });
        if (status === 401) {
          openAuthModal("login");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [openAuthModal, orderNumber, showToast]);

  const receiptState = useMemo(() => getReceiptState(order), [order]);
  const selectedTab = useMemo(
    () => purchaseTabs.find((tab) => tab.id === activeTab) || purchaseTabs[0],
    [activeTab]
  );
  const filteredOrders = useMemo(() => {
    if (!selectedTab.statuses) return orders;
    return orders.filter((purchase) => selectedTab.statuses.includes(purchase.status));
  }, [orders, selectedTab]);
  const isSelfPickup = order?.fulfillment_method === "self_pickup";
  const address = [
    order?.delivery_addr1,
    order?.delivery_addr2,
    order?.delivery_postcode,
    order?.delivery_city,
    order?.delivery_state,
  ]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[520px] max-w-3xl items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500">
            {orderNumber ? "Loading purchase..." : "Loading purchases..."}
          </p>
        </section>
      </main>
    );
  }

  if (!orderNumber && error) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center text-center">
          <img src={failedImage} alt="" className="h-24 w-24 object-contain" />
          <h1 className="prata-regular mt-6 text-4xl text-stone-950 sm:text-5xl">
            Purchases not loaded
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">{error}</p>
        </section>
      </main>
    );
  }

  if (!orderNumber) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto max-w-6xl">
          <div className="border-b border-stone-200 pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              Purchases
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              My Purchase History
            </h1>
          </div>

          <div className="mt-6 overflow-x-auto border-b border-stone-200 bg-white">
            <div className="flex min-w-max items-center">
              {purchaseTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-h-14 px-8 text-sm font-medium transition ${
                      isActive ? "text-red-600" : "text-stone-950 hover:text-red-600"
                    }`}
                  >
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-red-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {orders.length ? (
            <div className="mt-8 grid grid-cols-1 gap-4">
              {filteredOrders.length ? (
                filteredOrders.map((purchase) => (
                  <Link
                    key={purchase.id}
                    to={`/purchase/${purchase.order_number}`}
                    className="rounded-lg border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:border-stone-500"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          {formatOrderDate(purchase.created_at)}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-stone-950">
                          {purchase.order_number}
                        </h2>
                        <p className="mt-2 text-sm text-stone-600">
                          {(purchase.items || []).length} item(s) - {formatStatus(purchase.fulfillment_method)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 text-sm md:items-end">
                        <span className="font-semibold text-stone-950">
                          {formatOrderMoney(purchase, purchase.total)}
                        </span>
                        <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
                          {formatStatus(purchase.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-stone-200 bg-white p-8 text-center">
                  <ClipboardList className="h-10 w-10 text-stone-400" strokeWidth={1.7} />
                  <h2 className="mt-4 text-lg font-semibold text-stone-950">
                    No {selectedTab.label.toLowerCase()} purchases
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    Purchases matching this status will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-900">
                <ClipboardList className="h-9 w-9" strokeWidth={1.7} />
              </div>
              <h2 className="prata-regular mt-6 text-4xl text-stone-950 sm:text-5xl">
                No purchases yet
              </h2>
              <Link
                to="/products"
                className="mt-8 flex min-h-12 items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
              >
                Browse Products
              </Link>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center text-center">
          <img src={failedImage} alt="" className="h-24 w-24 object-contain" />
          <h1 className="prata-regular mt-6 text-4xl text-stone-950 sm:text-5xl">
            Purchase not found
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">{error}</p>
          <Link
            to="/cart"
            className="mt-8 flex min-h-12 items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
          >
            Back To Cart
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-6xl">
        <div
          className={`rounded-lg border p-6 ${
            receiptState.tone === "rose"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : receiptState.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-stone-200 bg-stone-50 text-stone-950"
          }`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={receiptState.image}
              alt=""
              className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.24em]">
                {receiptState.label}
              </p>
              <h1 className="prata-regular mt-2 text-4xl leading-tight text-stone-950 sm:text-5xl">
                {receiptState.title}
              </h1>
              <p className="mt-3 text-sm leading-7">{receiptState.message}</p>
              <p className="mt-3 text-sm font-semibold text-stone-950">
                Receipt: {order.order_number}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Customer Details
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailRow icon={UserRound} label="Name" value={order.contact_name} />
                <DetailRow icon={Phone} label="Contact" value={order.contact_mobile} />
                <DetailRow icon={Mail} label="Email" value={order.contact_email} />
                <DetailRow
                  icon={isSelfPickup ? Store : Truck}
                  label="Fulfillment"
                  value={formatStatus(order.fulfillment_method)}
                />
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                {isSelfPickup ? "Self Collect Details" : "Delivery Details"}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-5">
                {isSelfPickup ? (
                  <DetailRow
                    icon={CalendarDays}
                    label="Pickup Date And Time"
                    value={formatDateTime(order.pickup_date, order.pickup_time)}
                  />
                ) : (
                  <DetailRow icon={MapPin} label="Delivery Address" value={address} />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Products
              </h2>
              <div className="mt-6 space-y-4">
                {(order.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 text-sm last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-950">{item.product_name}</p>
                      <p className="mt-1 text-stone-500">
                        Qty {item.quantity} x {formatOrderMoney(order, item.unit_price)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-stone-950">
                      {formatOrderMoney(order, item.line_total)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-stone-200 bg-[#f7f4ef] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:sticky lg:top-28">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
              Receipt Summary
            </h2>
            <div className="mt-6 space-y-4 text-sm text-stone-600">
              <div className="flex items-center justify-between gap-4">
                <span>Order Status</span>
                <span className="text-right font-semibold text-stone-950">
                  {formatStatus(order.status)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Payment Status</span>
                <span className="text-right font-semibold text-stone-950">
                  {formatStatus(order.payment?.status || "pending")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Payment Method</span>
                <span className="text-right font-semibold text-stone-950">
                  {formatStatus(order.payment_method)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Provider</span>
                <span className="text-right font-semibold text-stone-950">
                  {formatStatus(order.payment?.provider || "manual")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-stone-300 pt-4">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-950">
                  {formatOrderMoney(order, order.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Delivery Fee</span>
                <span className="font-semibold text-stone-950">
                  {formatOrderMoney(order, order.delivery_fee)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-stone-300 pt-4 text-base">
                <span className="font-semibold text-stone-950">Total</span>
                <span className="text-2xl font-semibold text-stone-950">
                  {formatOrderMoney(order, order.total)}
                </span>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-1 gap-3">
              <Link
                to="/products"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default MyPurchase;
