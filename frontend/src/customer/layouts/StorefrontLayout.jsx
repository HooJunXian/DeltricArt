import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import ChatbotPanel from "../components/ChatbotPanel";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const StorefrontLayout = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return (
    <>
      <Navbar />
      <div className="px-4 pt-[84px] sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
        <Outlet />
      </div>
      <Footer />
      <ChatbotPanel />
    </>
  );
};

export default StorefrontLayout;
