import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, usePermisos, puedeVerModulo } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { NotificationBell } from "./NotificationBell";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  BookOpen,
  LogOut,
  Users,
  PanelLeftOpen,
  ChevronLeft,
  X,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { api } from "../config/api";

function avatarUrl(avatar?: string): string {
  if (!avatar) return "";
  return api(`/${avatar}`);
}

interface SidebarProps {
  visible: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSearchOpen: () => void;
}

function Sidebar({ visible, onToggle, mobileOpen, onMobileClose, onSearchOpen }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const permisos = usePermisos();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  const links = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, modulo: "dashboard" as const },
    { path: "/procedimientos", label: "Procedimientos", icon: ClipboardList, modulo: "procedimientos" as const },
    { path: "/errores", label: "Errores", icon: Search, modulo: "errores" as const },
    { path: "/documentacion", label: "Documentacion", icon: BookOpen, modulo: "documentacion" as const },
  ];

  const adminLinks = [
    { path: "/logs", label: "Actividad", icon: Activity, modulo: "actividad" as const },
    { path: "/usuarios", label: "Usuarios", icon: Users, modulo: "usuarios" as const },
  ];

  return (
    <>
      <aside className={`sidebar ${visible ? "" : "colapsado"} ${mobileOpen ? "visible-mobile" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span>Portal de herramientas</span>
          </div>
          <button className="sidebar-toggle-btn" onClick={onToggle} title="Ocultar sidebar">
            <ChevronLeft size={16} />
          </button>
          <button className="sidebar-mobile-close" onClick={onMobileClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-top-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <NotificationBell />
          <button className="sidebar-theme-btn" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="sidebar-search-bar" onClick={() => { onSearchOpen(); onMobileClose(); }}>
          <Search size={14} />
          <span className="sidebar-search-text">Buscar...</span>
          <span className="sidebar-search-kbd">Ctrl K</span>
        </div>

        <nav className="sidebar-nav">
          {links.filter((l) => puedeVerModulo(permisos, l.modulo)).map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => onMobileClose()}
              >
                <span className={`sidebar-icon ${isActive ? "active" : ""}`}>
                  <Icon size={18} strokeWidth={2} />
                </span>
                {link.label}
              </Link>
            );
          })}
          {adminLinks.filter((l) => puedeVerModulo(permisos, l.modulo)).length > 0 && (
            <>
              <div className="sidebar-separator" />
              {adminLinks.filter((l) => puedeVerModulo(permisos, l.modulo)).map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                    onClick={() => onMobileClose()}
                  >
                    <span className={`sidebar-icon ${isActive ? "active" : ""}`}>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          {usuario && (
            <>
              <Link to="/perfil" className="sidebar-user" title="Ver perfil" onClick={() => onMobileClose()}>
                <div className="sidebar-avatar">
                  {usuario.avatar ? (
                    <img src={avatarUrl(usuario.avatar)} alt={usuario.nombre} className="sidebar-avatar-img" />
                  ) : (
                    usuario.nombre?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{usuario.nombre}</span>
                  <span className="sidebar-user-role">{usuario.rol}</span>
                </div>
              </Link>
              <button onClick={cerrarSesion} className="sidebar-logout">
                <LogOut size={16} />
                <span>Cerrar Sesion</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {!visible && !mobileOpen && (
        <div className="sidebar-tab" onClick={onToggle} title="Mostrar sidebar">
          <PanelLeftOpen size={14} />
        </div>
      )}
    </>
  );
}

export default Sidebar;
