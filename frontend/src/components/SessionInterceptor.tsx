import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const INACTIVIDAD_MS = 3 * 60 * 1000;
const ACTIVIDAD_KEY = "portal-ultima-actividad";

/**
 * Mensaje de cierre segun la causa real:
 * - Si el usuario estuvo inactivo >= 3 min, fue inactividad.
 * - Si estuvo activo (o hay actividad reciente), fue expiracion del servidor.
 */
function mensajeSegunCausa(): string {
  const raw = localStorage.getItem(ACTIVIDAD_KEY);
  const ultima = raw ? Number(raw) : NaN;
  const inactivo = Number.isFinite(ultima) ? Date.now() - ultima : Infinity;
  return inactivo >= INACTIVIDAD_MS
    ? "Sesion cerrada por inactividad. Inicie sesion nuevamente."
    : "Sesion expirada. Inicie sesion nuevamente.";
}

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

      // Ignorar 401 del login/refresh para no duplicar mensajes:
      //  - login: lo maneja Login.tsx
      //  - refresh: si falla, el timer de inactividad decide el mensaje
      const esLogin = url.includes("/auth/login");
      const esRefresh = url.includes("/auth/refresh");

      if (response.status === 401 && !esLogin && !esRefresh) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data.message === "Usuario inhabilitado") {
            window.dispatchEvent(new CustomEvent("auth:usuario-inhabilitado"));
          } else {
            window.dispatchEvent(new CustomEvent("auth:sesion-expirada"));
          }
        } catch {
          window.dispatchEvent(new CustomEvent("auth:sesion-expirada"));
        }
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
    function onExpirada() {
      logoutWithMessage(mensajeSegunCausa());
    }
    window.addEventListener("auth:usuario-inhabilitado", onInhabilitado);
    window.addEventListener("auth:sesion-expirada", onExpirada);
    return () => {
      window.removeEventListener("auth:usuario-inhabilitado", onInhabilitado);
      window.removeEventListener("auth:sesion-expirada", onExpirada);
    };
  }, [logoutWithMessage]);

  return null;
}

export default SessionInterceptor;
