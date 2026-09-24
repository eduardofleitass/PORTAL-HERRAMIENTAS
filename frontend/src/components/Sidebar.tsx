import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  const links = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/procedimientos", label: "Procedimientos", icon: "📋" },
    { path: "/errores", label: "Errores", icon: "🔍" },
    { path: "/documentacion", label: "Documentacion", icon: "📚" },
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
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "active" : ""}`}
          >
            <span className="sidebar-icon">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {usuario && (
          <>
            <div className="sidebar-user">
              <div className="sidebar-avatar">{usuario.nombre?.charAt(0)?.toUpperCase() || "U"}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{usuario.nombre}</span>
                <span className="sidebar-user-role">{usuario.rol}</span>
              </div>
            </div>
            <button onClick={cerrarSesion} className="sidebar-logout">
              <span>🚪</span> Cerrar Sesion
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
