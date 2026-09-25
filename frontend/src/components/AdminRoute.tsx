import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
