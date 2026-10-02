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

/** Decodifica el payload de un JWT sin verificar firma */
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return null; }
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  updateUser: (usuario: Usuario) => void;
  logoutWithMessage: (message: string) => void;
  logoutMessage: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [logoutMessage, setLogoutMessage] = useState<string>("");

  function login(token: string, usuario: Usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    setLogoutMessage("");
    setToken(token);
    setUsuario(usuario);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setLogoutMessage("");
    setToken(null);
    setUsuario(null);
  }

  function logoutWithMessage(message: string) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setLogoutMessage(message);
    setToken(null);
    setUsuario(null);
  }

  function updateUser(usuario: Usuario) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    setUsuario(usuario);
  }

  // Verificar expiracion del token cada 60 segundos
  useEffect(() => {
    if (!token) return;
    const payload = decodeJWT(token);
    if (!payload?.exp) return;

    const expMs = payload.exp * 1000;

    function checkExpired() {
      if (Date.now() >= expMs) {
        logoutWithMessage("Sesion expirada. Inicie sesion nuevamente.");
      }
    }

    checkExpired(); // verificar inmediatamente
    const interval = setInterval(checkExpired, 60000); // cada 60s
    return () => clearInterval(interval);
  }, [token]);

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, logoutWithMessage, updateUser, logoutMessage }}>
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
