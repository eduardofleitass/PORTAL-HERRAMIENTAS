import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function SessionInterceptor() {
  const { logoutWithMessage } = useAuth();

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function(...args: Parameters<typeof fetch>): Promise<Response> {
      const response = await originalFetch.apply(window, args);

      let url = "";
      if (typeof args[0] === "string") {
        url = args[0];
      } else if (args[0] instanceof Request) {
        url = args[0].url;
      }

      // Ignorar 401 del login para no duplicar mensaje con Login.tsx
      if (response.status === 401 && !url.includes("/auth/login")) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data.message === "Usuario inhabilitado") {
            window.dispatchEvent(new CustomEvent("auth:usuario-inhabilitado"));
          }
        } catch {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    function onInhabilitado() {
      logoutWithMessage("Usuario inhabilitado");
    }
    window.addEventListener("auth:usuario-inhabilitado", onInhabilitado);
    return () => window.removeEventListener("auth:usuario-inhabilitado", onInhabilitado);
  }, [logoutWithMessage]);

  return null;
}

export default SessionInterceptor;
