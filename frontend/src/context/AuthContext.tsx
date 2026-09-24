import { createContext, useContext, useState, type ReactNode } from "react";

//Forma de un usuario (sin password)
interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

// Forma del contexto: que datos y funciones expone
interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

// Creamos el contexto (la "caja" vacia)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// El Provider: envuelve toda la app
export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializamos el estado leyendo localStorage directamente (sin useEffect)
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
  return localStorage.getItem("token");
});

  function login(token: string, usuario: Usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    setToken(token);
    setUsuario(usuario);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

//Hook personalizado para leer el contexto facilmente
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}