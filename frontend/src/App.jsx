import React from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import AdminRoutes from "./admin/routes/AdminRoutes"
import CustomerRoutes from "./customer/routes/CustomerRoutes"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {CustomerRoutes()}
        {AdminRoutes()}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
