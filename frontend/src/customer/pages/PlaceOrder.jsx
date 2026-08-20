import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import billPlzLogo from "../../assets/BillPlz_logo.png";
import api from "../../api";
import { ShopContext } from "../context/shop-context";

const fulfillmentMethods = [
  {
    id: "delivery",
    title: "Delivery",
    description: "Ship this order to your delivery address.",
    icon: Truck,
  },
  {
    id: "self_pickup",
    title: "Self pickup",
    description: "Collect your order by appointment on a weekday.",
    icon: Store,
  },
];

const paymentMethods = [
  {
    id: "billplz_card",
    title: "Credit/Debit card",
    description: "Secure card payment via BillPlz.",
    logo: billPlzLogo,
  },
];

const PICKUP_START_TIME = "10:00";
const PICKUP_END_TIME = "18:00";

const getMissingField = (fields) =>
  fields.find(({ value }) => !String(value || "").trim());

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getNextWeekday = (date) => {
  const nextDate = new Date(date);

  while (isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
};

const getEarliestPickupDateTime = () => {
  const nextSlot = new Date();
  nextSlot.setSeconds(0, 0);
  if (nextSlot.getSeconds() || nextSlot.getMilliseconds()) {
    nextSlot.setMinutes(nextSlot.getMinutes() + 1);
  }

  const startToday = new Date(nextSlot);
  startToday.setHours(10, 0, 0, 0);
  const endToday = new Date(nextSlot);
  endToday.setHours(18, 0, 0, 0);

  if (isWeekend(nextSlot) || nextSlot > endToday) {
    nextSlot.setDate(nextSlot.getDate() + 1);
    nextSlot.setHours(10, 0, 0, 0);
    return getNextWeekday(nextSlot);
  }

  if (nextSlot < startToday) {
    return startToday;
  }

  return nextSlot;
};

const PlaceOrder = () => {
  const navigate = useNavigate();
  const {
    cartProducts,
    cartSubtotal,
    delivery_fee,
    formatMoney,
    user,
    openAuthModal,
    showToast,
    loadCart,
  } = useContext(ShopContext);
  const [fulfillmentMethod, setFulfillmentMethod] = useState(fulfillmentMethods[0].id);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupError, setPickupError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationPayload, setConfirmationPayload] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.username || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    address1: "",
    address2: "",
    postcode: "",
    city: "",
    state: "",
  });

  const hasItems = cartProducts.length > 0;
  const isSelfPickup = fulfillmentMethod === "self_pickup";
  const deliveryTotal = hasItems && !isSelfPickup ? delivery_fee : 0;
  const grandTotal = cartSubtotal + deliveryTotal;
  const now = new Date();
  const todayInputValue = toDateInputValue(now);
  const earliestPickupDateTime = getEarliestPickupDateTime();
  const earliestPickupDateValue = toDateInputValue(earliestPickupDateTime);
  const earliestPickupTimeValue = toTimeInputValue(earliestPickupDateTime);
  const selectedFulfillment = useMemo(
    () => fulfillmentMethods.find((method) => method.id === fulfillmentMethod),
    [fulfillmentMethod]
  );
  useEffect(() => {
    if (!user) return;

    setFormData((current) => ({
      ...current,
      name: current.name || user.username || "",
      email: current.email || user.email || "",
      mobile: current.mobile || user.mobile || "",
    }));
  }, [user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const isWeekendDate = (value) => {
    if (!value) return false;

    const [year, month, date] = value.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, date);
    const day = selectedDate.getDay();
    return day === 0 || day === 6;
  };

  const isOutsidePickupHours = (timeValue) =>
    Boolean(timeValue) && (timeValue < PICKUP_START_TIME || timeValue > PICKUP_END_TIME);

  const isPastPickupDateTime = (dateValue, timeValue) => {
    if (!dateValue) return false;
    if (dateValue < todayInputValue) return true;
    if (!timeValue) return false;

    const selectedDateTime = new Date(`${dateValue}T${timeValue}`);
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);

    return selectedDateTime < currentMinute;
  };

  const getPickupDateTimeError = (dateValue, timeValue) => {
    if (!dateValue && !timeValue) return "";
    if (isPastPickupDateTime(dateValue, timeValue)) {
      return "Please choose a pickup date and time that is not earlier than now.";
    }
    if (isWeekendDate(dateValue)) return "Please choose a weekday pickup date.";
    if (isOutsidePickupHours(timeValue)) {
      return "Pickup is available from 10:00 AM to 6:00 PM on weekdays.";
    }
    return "";
  };

  const setEarliestPickupDateTime = () => {
    const earliest = getEarliestPickupDateTime();
    setPickupDate(toDateInputValue(earliest));
    setPickupTime(toTimeInputValue(earliest));
    setPickupError("");
  };

  const handlePickupDateChange = (event) => {
    const { value } = event.target;
    setPickupDate(value);
    setPickupError(getPickupDateTimeError(value, pickupTime));
  };

  const handlePickupTimeChange = (event) => {
    const { value } = event.target;
    setPickupTime(value);
    setPickupError(getPickupDateTimeError(pickupDate, value));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!hasItems) {
      showToast({
        type: "error",
        title: "Cart is empty",
        message: "Add at least one product before checkout.",
      });
      return;
    }

    const missingContactField = getMissingField([
      { label: "name", value: formData.name },
      { label: "email", value: formData.email },
      { label: "mobile number", value: formData.mobile },
    ]);

    if (missingContactField) {
      showToast({
        type: "error",
        title: "Missing details",
        message: `Please enter your ${missingContactField.label}.`,
      });
      return;
    }

    if (!isValidEmail(formData.email)) {
      showToast({
        type: "error",
        title: "Invalid email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (isSelfPickup) {
      if (!pickupDate || !pickupTime) {
        setPickupError("Please choose a pickup date and time.");
        showToast({
          type: "error",
          title: "Missing pickup details",
          message: "Please choose a pickup date and time.",
        });
        return;
      }

      if (isWeekendDate(pickupDate)) {
        setPickupError("Please choose a weekday pickup date.");
        showToast({
          type: "error",
          title: "Pickup unavailable",
          message: "Weekend pickup is unavailable. Please choose a weekday.",
        });
        return;
      }

      if (isPastPickupDateTime(pickupDate, pickupTime)) {
        setPickupError("Please choose a pickup date and time that is not earlier than now.");
        showToast({
          type: "error",
          title: "Pickup unavailable",
          message: "Please choose a pickup date and time that is not earlier than now.",
        });
        return;
      }

      if (isOutsidePickupHours(pickupTime)) {
        setPickupError("Pickup is available from 10:00 AM to 6:00 PM on weekdays.");
        showToast({
          type: "error",
          title: "Pickup unavailable",
          message: "Pickup is available from 10:00 AM to 6:00 PM on weekdays.",
        });
        return;
      }
    } else {
      const missingDeliveryField = getMissingField([
        { label: "postcode", value: formData.postcode },
        { label: "address", value: formData.address1 },
        { label: "city", value: formData.city },
        { label: "state", value: formData.state },
      ]);

      if (missingDeliveryField) {
        showToast({
          type: "error",
          title: "Missing delivery details",
          message: `Please enter your ${missingDeliveryField.label}.`,
        });
        return;
      }
    }

    const payload = {
      fulfillment_method: fulfillmentMethod,
      payment_method: paymentMethod,
      contact_name: formData.name.trim(),
      contact_email: formData.email.trim(),
      contact_mobile: formData.mobile.trim(),
    };

    if (isSelfPickup) {
      payload.pickup_date = pickupDate;
      payload.pickup_time = pickupTime;
    } else {
      payload.delivery_addr1 = formData.address1.trim();
      payload.delivery_addr2 = formData.address2.trim();
      payload.delivery_postcode = formData.postcode.trim();
      payload.delivery_city = formData.city.trim();
      payload.delivery_state = formData.state.trim();
    }

    setConfirmationPayload(payload);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmPayment = async () => {
    if (!confirmationPayload || submitting) return;

    setSubmitting(true);
    try {
      const response = await api.post("/api/checkout/", confirmationPayload);
      const orderNumber = response.data?.order?.order_number;

      if (response.data?.payment_url) {
        window.location.href = response.data.payment_url;
        return;
      }

      showToast({
        type: "success",
        title: "Order submitted",
        message: "Your order has been recorded for manual processing.",
      });
      await loadCart();
      navigate(orderNumber ? `/receipt/${orderNumber}` : "/receipt");
    } catch (error) {
      showToast({
        type: "error",
        title: "Checkout failed",
        message:
          error.response?.data?.detail ||
          "Unable to submit your order right now. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasItems) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[560px] max-w-3xl flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-900">
            <ShoppingBag className="h-9 w-9" strokeWidth={1.7} />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
            Checkout
          </p>
          <h1 className="prata-regular mt-4 text-4xl text-stone-950 sm:text-5xl">
            Your cart is empty
          </h1>
          <Link
            to="/products"
            className="mt-8 flex min-h-12 items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
          >
            Browse Products
          </Link>
        </section>
      </main>
    );
  }

  if (confirmationPayload) {
    const selectedPayment = paymentMethods.find(
      (method) => method.id === confirmationPayload.payment_method
    );

    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto max-w-5xl">
          <div className="border-b border-stone-200 pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              Final Review
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              Confirm Your Order
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Check the details below. Your order and payment session will only be created
              after you confirm.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                  Contact & Fulfillment
                </h2>
                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-stone-500">Name</dt>
                    <dd className="mt-1 font-semibold text-stone-950">{confirmationPayload.contact_name}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Mobile</dt>
                    <dd className="mt-1 font-semibold text-stone-950">{confirmationPayload.contact_mobile}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Email</dt>
                    <dd className="mt-1 break-all font-semibold text-stone-950">{confirmationPayload.contact_email}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Method</dt>
                    <dd className="mt-1 font-semibold text-stone-950">{selectedFulfillment?.title}</dd>
                  </div>
                  {isSelfPickup ? (
                    <div className="sm:col-span-2">
                      <dt className="text-stone-500">Pickup appointment</dt>
                      <dd className="mt-1 font-semibold text-stone-950">
                        {new Date(`${pickupDate}T${pickupTime}`).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <dt className="text-stone-500">Delivery address</dt>
                      <dd className="mt-1 font-semibold leading-6 text-stone-950">
                        {[confirmationPayload.delivery_addr1, confirmationPayload.delivery_addr2]
                          .filter(Boolean)
                          .join(", ")}
                        <br />
                        {confirmationPayload.delivery_postcode} {confirmationPayload.delivery_city}, {confirmationPayload.delivery_state}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                  Items
                </h2>
                <div className="mt-6 divide-y divide-stone-200">
                  {cartProducts.map((product) => (
                    <div key={product._id} className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-stone-950">{product.name}</p>
                        <p className="mt-1 text-sm text-stone-500">Quantity {product.quantity}</p>
                      </div>
                      <p className="font-semibold text-stone-950">
                        {formatMoney(product.price * product.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-lg border border-stone-200 bg-[#f7f4ef] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:sticky lg:top-28">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Payment Summary
              </h2>
              <div className="mt-6 space-y-4 text-sm text-stone-600">
                <div className="flex justify-between gap-4">
                  <span>Payment</span>
                  <span className="text-right font-semibold text-stone-950">{selectedPayment?.title}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-950">{formatMoney(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-stone-950">{formatMoney(deliveryTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-stone-300 pt-4">
                  <span className="font-semibold text-stone-950">Total</span>
                  <span className="text-2xl font-semibold text-stone-950">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="mt-7 flex min-h-12 w-full items-center justify-center rounded-lg bg-stone-950 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {submitting ? "Creating Payment..." : "Proceed"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmationPayload(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={submitting}
                className="mt-3 min-h-11 w-full rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              Checkout
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              Place Your Order
            </h1>
          </div>

          <Link
            to="/cart"
            className="flex w-fit items-center gap-2 border-b border-stone-400 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back To Cart
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
        >
          <div className="space-y-8">
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Delivery Or Pickup
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fulfillmentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = fulfillmentMethod === method.id;

                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition ${
                        isSelected
                          ? "border-stone-950 bg-stone-50"
                          : "border-stone-200 bg-white hover:border-stone-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fulfillment_method"
                        value={method.id}
                        checked={isSelected}
                        onChange={(event) => {
                          setFulfillmentMethod(event.target.value);
                          if (event.target.value === "self_pickup") {
                            setEarliestPickupDateTime();
                          } else {
                            setPickupError("");
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-950 text-white">
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-stone-950">{method.title}</span>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-rose-700" strokeWidth={1.8} />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-stone-600">
                          {method.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {isSelfPickup ? (
                <div className="mt-6 max-w-2xl">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                    Pickup date and time
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Date
                      </span>
                      <input
                        type="date"
                        value={pickupDate}
                        min={earliestPickupDateValue}
                        onChange={handlePickupDateChange}
                        className={`mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-stone-950 ${
                          pickupError ? "border-rose-300 bg-rose-50" : "border-stone-200"
                        }`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Time
                      </span>
                      <input
                        type="time"
                        value={pickupTime}
                        min={
                          pickupDate === earliestPickupDateValue
                            ? earliestPickupTimeValue
                            : PICKUP_START_TIME
                        }
                        max={PICKUP_END_TIME}
                        onChange={handlePickupTimeChange}
                        className={`mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-stone-950 ${
                          pickupError ? "border-rose-300 bg-rose-50" : "border-stone-200"
                        }`}
                      />
                    </label>
                  </div>
                  {pickupError ? (
                    <span className="mt-2 block text-sm text-rose-700">{pickupError}</span>
                  ) : (
                    <span className="mt-2 block text-sm text-stone-500">
                      Weekday pickup is available from 10:00 AM to 6:00 PM.
                    </span>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-stone-950" strokeWidth={1.8} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                  {isSelfPickup ? "Contact Details" : "Delivery Details"}
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Name</span>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Mobile</span>
                  <input
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                  />
                </label>
                {!isSelfPickup ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">Postcode</span>
                      <input
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-stone-700">Address 1</span>
                      <input
                        name="address1"
                        value={formData.address1}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-stone-700">Address 2</span>
                      <input
                        name="address2"
                        value={formData.address2}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">City</span>
                      <input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">State</span>
                      <input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
                Payment Method
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {paymentMethods.map((method) => {
                  const isSelected = paymentMethod === method.id;

                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition ${
                        isSelected
                          ? "border-stone-950 bg-stone-50"
                          : "border-stone-200 bg-white hover:border-stone-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method.id}
                        checked={isSelected}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        className="sr-only"
                      />
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white px-2">
                        <img
                          src={method.logo}
                          alt={`${method.title} logo`}
                          className="max-h-8 max-w-full object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-stone-950">{method.title}</span>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-rose-700" strokeWidth={1.8} />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-stone-600">
                          {method.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-stone-200 bg-[#f7f4ef] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:sticky lg:top-28">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4">
              {cartProducts.map((product) => (
                <div key={product._id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-stone-950">{product.name}</p>
                    <p className="mt-1 text-stone-500">Qty {product.quantity}</p>
                  </div>
                  <p className="font-semibold text-stone-950">
                    {formatMoney(product.price * product.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4 border-t border-stone-300 pt-5 text-sm text-stone-600">
              <div className="flex items-center justify-between gap-4">
                <span>Method</span>
                <span className="font-semibold text-stone-950">
                  {selectedFulfillment?.title}
                </span>
              </div>
              {isSelfPickup && pickupDate && pickupTime ? (
                <div className="flex items-center justify-between gap-4">
                  <span>Pickup</span>
                  <span className="text-right font-semibold text-stone-950">
                    {new Date(`${pickupDate}T${pickupTime}`).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-950">{formatMoney(cartSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Delivery Fee</span>
                <span className="font-semibold text-stone-950">{formatMoney(deliveryTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-stone-300 pt-4 text-base">
                <span className="font-semibold text-stone-950">Total</span>
                <span className="text-2xl font-semibold text-stone-950">
                  {formatMoney(grandTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              Next
            </button>
          </aside>
        </form>
      </section>
    </main>
  );
};

export default PlaceOrder;

