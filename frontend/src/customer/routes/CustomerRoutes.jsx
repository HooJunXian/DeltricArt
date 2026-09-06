import React from "react";
import { Navigate, Route } from "react-router-dom";

import About from "../pages/About";
import Cart from "../pages/Cart";
import Contact from "../pages/Contact";
import Home from "../pages/Home";
import MyPurchase from "../pages/MyPurchase";
import MyRooms from "../pages/MyRooms";
import PlaceOrder from "../pages/PlaceOrder";
import Product from "../pages/Product";
import Products from "../pages/Products";
import RoomCustomizer from "../pages/RoomCustomizer";
import StorefrontLayout from "../layouts/StorefrontLayout";

const CustomerRoutes = () => (
  <>
    <Route element={<StorefrontLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/collection" element={<Navigate to="/products" replace />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/product/:productId" element={<Product />} />
      <Route path="/room-customizer" element={<RoomCustomizer />} />
      <Route path="/room-customizer/:roomId" element={<RoomCustomizer />} />
      <Route path="/my-rooms" element={<MyRooms />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/place-order" element={<PlaceOrder />} />
      <Route path="/order" element={<MyPurchase />} />
      <Route path="/order/:orderNumber" element={<MyPurchase />} />
      <Route path="/purchase" element={<MyPurchase />} />
      <Route path="/purchase/:orderNumber" element={<MyPurchase />} />
      <Route path="/receipt" element={<MyPurchase />} />
      <Route path="/receipt/:orderNumber" element={<MyPurchase />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
    </Route>

    <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
  </>
);

export default CustomerRoutes;

