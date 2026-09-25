import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  BookOpen,
  LogOut,
  Users,
  Camera,
  PanelLeftOpen,
  ChevronLeft,
  X
} from "lucide-react";

function avatarUrl(avatar?: string): string {
  if (!avatar) return "";
  return `http://localhost:3001/${avatar}`;
}

interface SidebarProps {
  visible: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSearchOpen: () => void;
}

function Sidebar({ visible, onToggle, mobileOpen, onMobileClose, onSearchOpen }: SidebarProps) {
  const { usuario, logout, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mostrarAvatarModal, setMostrarAvatarModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function guardarAvatar() {
    if (!avatarFile || !usuario || !token) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await fetch("http://localhost:3001/auth/me/avatar", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Error al subir avatar");
      const data = await res.json();
      updateUser({ ...usuario, avatar: data.avatar });
      setMostrarAvatarModal(false);
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch {
      alert("Error al subir la foto");
    } finally {
      setSubiendo(false);
    }
  }

  const links = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/procedimientos", label: "Procedimientos", icon: ClipboardList },
    { path: "/errores", label: "Errores", icon: Search },
    { path: "/documentacion", label: "Documentacion", icon: BookOpen },
  ];

  const adminLinks = [
    { path: "/usuarios", label: "Usuarios", icon: Users },
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

        <div className="sidebar-search-bar" onClick={() => { onSearchOpen(); onMobileClose(); }}>
          <Search size={14} />
          <span className="sidebar-search-text">Buscar...</span>
          <span className="sidebar-search-kbd">Ctrl K</span>
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
                onClick={() => onMobileClose()}
              >
                <span className={`sidebar-icon ${isActive ? "active" : ""}`}>
                  <Icon size={18} strokeWidth={2} />
                </span>
                {link.label}
              </Link>
            );
          })}
          {usuario?.rol === "admin" && (
            <>
              <div className="sidebar-separator" />
              {adminLinks.map((link) => {
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
              <div className="sidebar-user" onClick={() => setMostrarAvatarModal(true)} title="Cambiar foto de perfil">
                <div className="sidebar-avatar">
                  {usuario.avatar ? (
                    <img src={avatarUrl(usuario.avatar)} alt={usuario.nombre} className="sidebar-avatar-img" />
                  ) : (
                    usuario.nombre?.charAt(0)?.toUpperCase() || "U"
                  )}
                  <div className="sidebar-avatar-badge">
                    <Camera size={10} />
                  </div>
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

      {/* Pestaña para mostrar sidebar cuando esta oculto */}
      {!visible && !mobileOpen && (
        <div className="sidebar-tab" onClick={onToggle} title="Mostrar sidebar">
          <PanelLeftOpen size={14} />
        </div>
      )}

      {/* Modal cambiar avatar */}
      {mostrarAvatarModal && (
        <div className="modal-overlay" onClick={() => setMostrarAvatarModal(false)}>
          <div className="modal-content avatar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Foto de perfil</h2>
              <button className="btn-cerrar-detalle" onClick={() => setMostrarAvatarModal(false)}>
                <span>✕</span>
              </button>
            </div>
            <div className="avatar-upload">
              <div className="avatar-preview-wrapper avatar-big" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="avatar-preview-img" />
                ) : usuario?.avatar ? (
                  <img src={avatarUrl(usuario.avatar)} alt={usuario.nombre} className="avatar-preview-img" />
                ) : (
                  <div className="avatar-preview-placeholder">
                    <Camera size={28} />
                  </div>
                )}
                <button
                  type="button"
                  className="avatar-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={14} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                hidden
              />
              <label className="avatar-label">Toca para cambiar tu foto</label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secundario" onClick={() => setMostrarAvatarModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primario" onClick={guardarAvatar} disabled={subiendo || !avatarFile}>
                {subiendo ? "Subiendo..." : "Guardar foto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
