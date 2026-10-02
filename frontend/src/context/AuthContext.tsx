import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface Permisos {
  modulos: {
    dashboard: boolean;
    procedimientos: boolean;
    errores: boolean;
    documentacion: boolean;
    actividad: boolean;
    usuarios: boolean;
  };
  acciones: {
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    exportarPDF: boolean;
    exportarCSV: boolean;
  };
}

export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  avatar?: string;
  permisos?: Permisos;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  updateUser: (usuario: Usuario) => void;
  logoutWithMessage: (message: string) => void;
  renovarToken: () => Promise<void>;
  logoutMessage: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Ventana de inactividad: si no hay actividad en este lapso, la sesion muere */
const INACTIVIDAD_MS = 3 * 60 * 1000; // 3 minutos
/** Cada cuanto se renueva el token mientras hay actividad */
const RENOVACION_MS = 60 * 1000; // 1 minuto
/** Clave compartida entre pestanas para coordinar la ultima actividad */
const ACTIVIDAD_KEY = "portal-ultima-actividad";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [logoutMessage, setLogoutMessage] = useState<string>("");

  /** Lee la ultima actividad (compartida entre pestanas), o ahora si no existe */
  function leerActividad(): number {
    const raw = localStorage.getItem(ACTIVIDAD_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : Date.now();
  }

  /** Marca actividad AHORA (cualquier pestana la ve) */
  function marcarActividad() {
    localStorage.setItem(ACTIVIDAD_KEY, String(Date.now()));
  }

  function login(token: string, usuario: Usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    marcarActividad();
    setLogoutMessage("");
    setToken(token);
    setUsuario(usuario);
  }

  function limpiarSesion(message: string, conMensaje: boolean) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem(ACTIVIDAD_KEY);
    setLogoutMessage(conMensaje ? message : "");
    setToken(null);
    setUsuario(null);
  }

  function logout() {
    limpiarSesion("", false);
  }

  function logoutWithMessage(message: string) {
    limpiarSesion(message, true);
  }

  function updateUser(usuario: Usuario) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    setUsuario(usuario);
  }

  /** Renueva el token con el backend (sesion deslizante) */
  async function renovarToken() {
    const actual = localStorage.getItem("token");
    if (!actual) return;
    try {
      const res = await fetch("http://localhost:3001/auth/refresh", {
        method: "POST",
        headers: { Authorization: "Bearer " + actual },
      });
      if (!res.ok) return; // el interceptor 401 se encarga del logout
      const data = await res.json();
      localStorage.setItem("token", data.token);
      if (data.usuario) localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setToken(data.token);
      if (data.usuario) setUsuario(data.usuario);
    } catch {
      // sin red: no renovamos, el proximo intento lo hara
    }
  }

  // ------------------------------------------------------------------
  // Sesion deslizante:
  //  - La actividad se registra en localStorage (compartida entre pestanas)
  //  - Mientras haya actividad, el token se renueva cada minuto
  //  - Si pasan 3 min sin actividad en NINGUNA pestana, se cierra sesion
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    marcarActividad();
    let ultimaRenovacion = Date.now();

    function registrarActividad() {
      marcarActividad();
    }

    function tick() {
      const inactivoMs = Date.now() - leerActividad();

      if (inactivoMs >= INACTIVIDAD_MS) {
        logoutWithMessage("Sesion cerrada por inactividad. Inicie sesion nuevamente.");
        return;
      }

      // Hay actividad reciente: renovar el token periodicamente
      if (Date.now() - ultimaRenovacion >= RENOVACION_MS) {
        ultimaRenovacion = Date.now();
        renovarToken();
      }
    }

    const eventos: (keyof WindowEventMap)[] = ["mousedown", "keydown", "scroll", "touchstart", "click", "mousemove"];
    eventos.forEach((e) => window.addEventListener(e, registrarActividad));

    // tick inmediato + cada 5s (suficiente precision para una ventana de 3 min)
    tick();
    const interval = setInterval(tick, 5000);

    // Sincronizar entre pestanas: si otra pestana cierra sesion, esta tambien
    function onStorage(e: StorageEvent) {
      if (e.key === "token" && !e.newValue) {
        setToken(null);
        setUsuario(null);
      }
      if (e.key === "token" && e.newValue) {
        setToken(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(interval);
      eventos.forEach((e) => window.removeEventListener(e, registrarActividad));
      window.removeEventListener("storage", onStorage);
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, logoutWithMessage, updateUser, renovarToken, logoutMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}

/** Helper para verificar permisos facilmente */
export function usePermisos(): Permisos | undefined {
  const { usuario } = useAuth();
  return usuario?.permisos;
}

export function puedeVerModulo(permisos: Permisos | undefined, modulo: keyof Permisos["modulos"]): boolean {
  if (!permisos) return false;
  return permisos.modulos[modulo] === true;
}

export function puedeRealizarAccion(permisos: Permisos | undefined, accion: keyof Permisos["acciones"]): boolean {
  if (!permisos) return false;
  return permisos.acciones[accion] === true;
}
