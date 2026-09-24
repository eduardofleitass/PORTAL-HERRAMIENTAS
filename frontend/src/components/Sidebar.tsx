import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  BookOpen,
  LogOut,
  Settings
} from "lucide-react";

function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  const links = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/procedimientos", label: "Procedimientos", icon: ClipboardList },
    { path: "/errores", label: "Errores", icon: Search },
    { path: "/documentacion", label: "Documentacion", icon: BookOpen },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <img src="/portalherramientas.png" alt="Logo" />
          <span>Portal EPEM</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className={`sidebar-icon ${isActive ? "active" : ""}`}>
                <Icon size={18} strokeWidth={2} />
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {usuario && (
          <>
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {usuario.nombre?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{usuario.nombre}</span>
                <span className="sidebar-user-role">{usuario.rol}</span>
              </div>
            </div>
            <button onClick={cerrarSesion} className="sidebar-logout">
              <LogOut size={16} />
              <span>Cerrar Sesion</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
