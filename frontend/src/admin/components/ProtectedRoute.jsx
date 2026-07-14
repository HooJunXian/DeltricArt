import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import api from "../../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../constants";

function ProtectedRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const updateAuthorization = (value) => {
      if (isMounted) {
        setIsAuthorized(value);
      }
    };

    const verifyAdminUser = async () => {
      const response = await api.get("/api/me/");
      const user = response.data;
      updateAuthorization(Boolean(user.is_staff || user.is_superuser));
    };

    const refreshToken = async () => {
      const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN);
      try {
        const res = await api.post("/api/token/refresh/", {
          refresh: refreshTokenValue,
        });

        if (res.status === 200) {
          localStorage.setItem(ACCESS_TOKEN, res.data.access);
          await verifyAdminUser();
        } else {
          updateAuthorization(false);
        }
      } catch (error) {
        console.log(error);
        updateAuthorization(false);
      }
    };

    const checkAuthorization = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        updateAuthorization(false);
        return;
      }

      const decoded = jwtDecode(token);
      const tokenExpiration = decoded.exp;
      const now = Date.now() / 1000;

      if (tokenExpiration < now) {
        await refreshToken();
      } else {
        await verifyAdminUser();
      }
    };

    checkAuthorization().catch(() => updateAuthorization(false));

    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthorized == null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? children : <Navigate to="/admin/login" replace />;
}

export default ProtectedRoute;
