import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { assets } from "../../assets/assets";
import { ShopContext } from "../context/shop-context";

const Cart = () => {
  const {
    cartProducts,
    cartSubtotal,
    cartLoading,
    formatMoney,
    delivery_fee,
    updateQuantity,
    removeFromCart,
  } = useContext(ShopContext);

  const hasItems = cartProducts.length > 0;
  const deliveryTotal = hasItems ? delivery_fee : 0;
  const grandTotal = cartSubtotal + deliveryTotal;

  if (cartLoading) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[560px] max-w-3xl items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500">
            Loading cart...
          </p>
        </section>
      </main>
    );
  }

  if (!hasItems) {
    return (
      <main className="pb-20 pt-10">
        <section className="mx-auto flex min-h-[560px] max-w-3xl flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-900">
            <ShoppingBag className="h-9 w-9" strokeWidth={1.7} />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
            Your Cart
          </p>
          <h1 className="prata-regular mt-4 text-4xl text-stone-950 sm:text-5xl">
            Your cart is empty
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
            Browse our products and add artwork or decor pieces to your cart
            before sending an enquiry or arranging checkout.
          </p>
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

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">
              Shopping Cart
            </p>
            <h1 className="prata-regular mt-4 text-4xl leading-tight text-stone-950 sm:text-5xl">
              Review Your Selected Pieces
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              Adjust quantities, review totals, then continue to order details or
              contact the studio for confirmation.
            </p>
          </div>

          <Link
            to="/products"
            className="flex w-fit items-center gap-2 border-b border-stone-400 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Continue Shopping
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {cartProducts.map((product) => (
              <article
                key={product._id}
                className="grid grid-cols-1 gap-5 rounded-lg border border-stone-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:grid-cols-[140px_1fr] sm:p-5"
              >
                <Link
                  to={`/product/${product._id}`}
                  className="aspect-square overflow-hidden rounded-lg bg-stone-100"
                >
                  <img
                    src={product.image[0] || assets.oilpainting_1}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                </Link>

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                      {product.subCategory}
                    </p>
                    <Link
                      to={`/product/${product._id}`}
                      className="mt-2 block text-xl font-semibold text-stone-950 transition hover:text-rose-800"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-600">
                      {product.description || "Product details will be updated soon."}
                    </p>
                    <p className="mt-4 text-lg font-semibold text-stone-950">
                      {formatMoney(product.price)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 md:flex-col md:items-end">
                    <div className="flex h-11 items-center overflow-hidden rounded-lg border border-stone-200">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(product._id, product.quantity - 1)
                        }
                        className="flex h-full w-11 items-center justify-center text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
                        aria-label={`Decrease ${product.name} quantity`}
                      >
                        <Minus className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                      <span className="flex h-full min-w-12 items-center justify-center border-x border-stone-200 px-4 text-sm font-semibold text-stone-950">
                        {product.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(product._id, product.quantity + 1)
                        }
                        className="flex h-full w-11 items-center justify-center text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
                        aria-label={`Increase ${product.name} quantity`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>

                    <p className="text-lg font-semibold text-stone-950">
                      {formatMoney(product.price * product.quantity)}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeFromCart(product._id)}
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400 transition hover:text-rose-800"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-stone-200 bg-[#f7f4ef] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:sticky lg:top-28">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-950">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm text-stone-600">
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-950">
                  {formatMoney(cartSubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Delivery Fee</span>
                <span className="font-semibold text-stone-950">
                  {formatMoney(deliveryTotal)}
                </span>
              </div>
              <div className="border-t border-stone-300 pt-4">
                <div className="flex items-center justify-between gap-4 text-base">
                  <span className="font-semibold text-stone-950">Total</span>
                  <span className="text-2xl font-semibold text-stone-950">
                    {formatMoney(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/place-order"
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-lg bg-stone-950 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-rose-800"
            >
              Place Order
            </Link>

            <p className="mt-5 text-xs leading-6 text-stone-500">
              Final delivery, framing, and availability can be confirmed by the
              Deltric Art team before payment.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default Cart;

