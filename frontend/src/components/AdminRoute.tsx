import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Admins tienen acceso total
  if (usuario.rol === "admin") {
    return children;
  }

  // Usuarios con permiso explicito en modulo usuarios
  if (usuario.permisos?.modulos?.usuarios === true) {
    return children;
  }

  return <Navigate to="/" replace />;
}

export default AdminRoute;
