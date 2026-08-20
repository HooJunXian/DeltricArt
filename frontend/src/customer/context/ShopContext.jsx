import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../api";
import ToastAlert from "../../components/ToastAlert";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../constants";
import MemberAuthModal from "../components/MemberAuthModal";
import {
  BASE_DELIVERY_FEE,
  formatCurrencyNumber,
  normalizeCurrencySettings,
  roundMoney,
} from "../utils/currency";
import { normalizeProduct } from "../utils/product";
import { ShopContext } from "./shop-context";

const ShopContextProvider = (props) => {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [company, setCompany] = useState(null);
  const [cartItems, setCartItems] = useState({});
  const [cartLoading, setCartLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: "login" });
  const [toast, setToast] = useState(null);

  const currencySettings = useMemo(
    () => normalizeCurrencySettings(user?.currency),
    [user?.currency]
  );
  const currency = currencySettings.symbol;
  const formatMoney = useCallback(
    (amount) => `${currencySettings.symbol}${formatCurrencyNumber(amount)}`,
    [currencySettings.symbol]
  );
  const delivery_fee = useMemo(
    () => roundMoney(BASE_DELIVERY_FEE * currencySettings.rate),
    [currencySettings.rate]
  );

  const displayProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        price: roundMoney(product.basePrice * currencySettings.rate),
      })),
    [currencySettings.rate, products]
  );

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await api.get("/api/products/");
      setProducts(response.data.map(normalizeProduct));
    } catch {
      setProducts([]);
      setProductsError("Unable to load products right now.");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadCompany = useCallback(async () => {
    try {
      const response = await api.get("/api/company/");
      setCompany(response.data || null);
      return response.data;
    } catch {
      setCompany(null);
      return null;
    }
  }, []);

  const applyCartResponse = (cart) => {
    const nextItems = {};
    (cart.items || []).forEach((item) => {
      nextItems[String(item.product_id)] = item.quantity;
    });
    setCartItems(nextItems);
  };

  const loadCart = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);

    if (!token) {
      setCartItems({});
      return null;
    }

    setCartLoading(true);
    try {
      const response = await api.get("/api/cart/");
      applyCartResponse(response.data);
      return response.data;
    } catch {
      setCartItems({});
      return null;
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);

    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return null;
    }

    try {
      const response = await api.get("/api/me/");
      setUser(response.data);
      await loadCart();
      return response.data;
    } catch {
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      setUser(null);
      setCartItems({});
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [loadCart]);

  useEffect(() => {
    loadCompany();
    loadProducts();
    loadCurrentUser();
  }, [loadCompany, loadCurrentUser, loadProducts]);

  const setAuthTokens = (access, refresh) => {
    localStorage.setItem(ACCESS_TOKEN, access);
    localStorage.setItem(REFRESH_TOKEN, refresh);
  };

  const handleMemberAuthenticated = async (access, refresh) => {
    setAuthTokens(access, refresh);
    await loadCurrentUser();
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setUser(null);
    setCartItems({});
  };

  const openAuthModal = useCallback((mode = "login") => {
    setAuthModal({ isOpen: true, mode });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const setAuthModalMode = useCallback((mode) => {
    setAuthModal({ isOpen: true, mode });
  }, []);

  const showToast = useCallback((nextToast) => {
    setToast({
      id: Date.now(),
      type: "success",
      ...nextToast,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, toast.duration || 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const requireCartLogin = () => {
    if (localStorage.getItem(ACCESS_TOKEN)) {
      return true;
    }

    openAuthModal("login");
    return false;
  };

  const addToCart = async (productId) => {
    if (!requireCartLogin()) return false;

    const productKey = String(productId);
    const currentQuantity = cartItems[productKey] || 0;

    setCartItems((currentItems) => ({
      ...currentItems,
      [productKey]: (currentItems[productKey] || 0) + 1,
    }));

    try {
      const response = await api.post("/api/cart/items/", {
        product_id: productId,
        quantity: 1,
      });
      applyCartResponse(response.data);
      return true;
    } catch (error) {
      setCartItems((currentItems) => {
        const nextItems = { ...currentItems };
        if (currentQuantity > 0) {
          nextItems[productKey] = currentQuantity;
        } else {
          delete nextItems[productKey];
        }
        return nextItems;
      });
      showToast({
        type: "error",
        title: "Cart not updated",
        message: error.response?.data?.detail || "Unable to add this product to your cart.",
      });
      return false;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!requireCartLogin()) return false;

    const productKey = String(productId);
    const previousQuantity = cartItems[productKey] || 0;

    setCartItems((currentItems) => {
      const nextItems = { ...currentItems };
      if (quantity <= 0) {
        delete nextItems[productKey];
      } else {
        nextItems[productKey] = quantity;
      }
      return nextItems;
    });

    try {
      await api.patch(`/api/cart/items/${productId}/`, { quantity });
      return true;
    } catch (error) {
      setCartItems((currentItems) => {
        const nextItems = { ...currentItems };
        if (previousQuantity > 0) {
          nextItems[productKey] = previousQuantity;
        } else {
          delete nextItems[productKey];
        }
        return nextItems;
      });
      showToast({
        type: "error",
        title: "Cart not updated",
        message: error.response?.data?.detail || "Unable to update this cart item.",
      });
      return false;
    }
  };

  const removeFromCart = (productId) => {
    updateQuantity(productId, 0);
  };

  const cartProducts = useMemo(
    () =>
      displayProducts
        .filter((product) => cartItems[product._id])
        .map((product) => ({
          ...product,
          quantity: cartItems[product._id],
        })),
    [cartItems, displayProducts]
  );

  const cartCount = useMemo(
    () => Object.values(cartItems).reduce((total, quantity) => total + quantity, 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartProducts.reduce((total, product) => total + product.price * product.quantity, 0),
    [cartProducts]
  );

  const value = {
    products: displayProducts,
    productsLoading,
    productsError,
    loadProducts,
    company,
    loadCompany,
    currency,
    formatMoney,
    delivery_fee,
    cartItems,
    cartLoading,
    cartProducts,
    cartCount,
    cartSubtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    user,
    authLoading,
    setAuthTokens,
    loadCurrentUser,
    loadCart,
    logout,
    openAuthModal,
    closeAuthModal,
    showToast,
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
      <MemberAuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={closeAuthModal}
        onModeChange={setAuthModalMode}
        onAuthenticated={handleMemberAuthenticated}
      />
      <ToastAlert toast={toast} onClose={closeToast} />
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;

