import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Plus, Pencil, Trash2, Shield, User, Camera, RotateCcw } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: "admin" | "usuario";
  avatar?: string;
  activo?: boolean;
}

interface FormData {
  username: string;
  password: string;
  nombre: string;
  rol: "admin" | "usuario";
  activo: boolean;
}

function avatarUrl(avatar?: string): string {
  if (!avatar) return "";
  return `http://localhost:3001/${avatar}`;
}

function Usuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormData>({
    username: "",
    password: "",
    nombre: "",
    rol: "usuario",
    activo: true,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3001/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar usuarios");
      const data = await res.json();
      setUsuarios(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm({ username: "", password: "", nombre: "", rol: "usuario", activo: true });
    setAvatarPreview(null);
    setAvatarFile(null);
    setMostrarForm(true);
  }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ username: u.username, password: "", nombre: u.nombre, rol: u.rol, activo: u.activo !== false });
    setAvatarPreview(u.avatar ? avatarUrl(u.avatar) : null);
    setAvatarFile(null);
    setMostrarForm(true);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editando
        ? `http://localhost:3001/usuarios/${editando.id}`
        : "http://localhost:3001/usuarios";
      const method = editando ? "PATCH" : "POST";
      const body = editando
        ? { ...form, ...(form.password ? {} : { password: undefined }) }
        : form;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al guardar usuario");
      const saved = await res.json();

      if (avatarFile && (editando || saved.id)) {
        const uid = editando ? editando.id : saved.id;
        await subirAvatar(uid);
      }

      setMostrarForm(false);
      setEditando(null);
      setAvatarPreview(null);
      setAvatarFile(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function toggleActivo(u: Usuario) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const nuevoEstado = !(u.activo !== false);
    try {
      const res = await fetch(`http://localhost:3001/usuarios/${u.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar estado");
    }
  }

  async function subirAvatar(userId: number) {
    if (!avatarFile) return;
    setSubiendoAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await fetch(`http://localhost:3001/usuarios/${userId}/avatar`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Error al subir avatar");
    } finally {
      setSubiendoAvatar(false);
    }
  }

  async function eliminar(id: number) {
    try {
      const res = await fetch(`http://localhost:3001/usuarios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  return (
    <>
    <div className="page-container">
      <div className="page-header">
        <h1>Usuarios</h1>
        <button className="btn-nuevo" onClick={abrirCrear}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
          <div className="error-retry">
            <button className="btn-retry" onClick={cargar}>
              <RotateCcw size={14} /> Reintentar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="loading-msg">Cargando...</p>
      ) : (
        <div className="tabla-container">
          <table className="tabla-dark">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="td-vacio">No hay usuarios</td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo === false ? "usuario-inactivo" : ""}>
                  <td>
                    <div className="td-user">
                      <div className="td-avatar">
                        {u.avatar ? (
                          <img src={avatarUrl(u.avatar)} alt={u.username} className="td-avatar-img" />
                        ) : (
                          u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {u.username}
                    </div>
                  </td>
                  <td>{u.nombre}</td>
                  <td>
                    <span className={`rol-badge ${u.rol === "admin" ? "rol-admin" : "rol-usuario"}`}>
                      {u.rol === "admin" ? <Shield size={12} /> : <User size={12} />}
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`toggle-estado ${u.activo !== false ? "activo" : "inactivo"}`}
                      onClick={() => toggleActivo(u)}
                      title={u.activo !== false ? "Desactivar usuario" : "Activar usuario"}
                    >
                      <span className="toggle-dot" />
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-icon" onClick={() => abrirEditar(u)} title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => setConfirmEliminar(u.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {mostrarForm && (
        <div className="modal-overlay" onClick={() => setMostrarForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editando ? "Editar usuario" : "Crear usuario"}</h2>
              <button className="btn-cerrar-detalle" onClick={() => setMostrarForm(false)}>
                <span>✕</span>
              </button>
            </div>
            <form onSubmit={guardar}>
              {/* Avatar upload */}
              <div className="form-group">
                <div className="avatar-upload">
                  <div className="avatar-preview-wrapper" onClick={() => fileInputRef.current?.click()}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="avatar-preview-img" />
                    ) : (
                      <div className="avatar-preview-placeholder">
                        <Camera size={24} />
                      </div>
                    )}
                    <button
                      type="button"
                      className="avatar-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Cambiar foto"
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
                  <label className="avatar-label">Foto de perfil</label>
                </div>
              </div>

              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  placeholder="nombre.apellido"
                />
              </div>
              <div className="form-group">
                <label>Password{editando && " (dejar vacio para no cambiar)"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editando}
                  placeholder="******"
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={form.activo ? "true" : "false"}
                  onChange={(e) => setForm({ ...form, activo: e.target.value === "true" })}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value as "admin" | "usuario" })}
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secundario" onClick={() => setMostrarForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primario" disabled={subiendoAvatar}>
                  {subiendoAvatar ? "Subiendo..." : editando ? "Guardar cambios" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

      <ConfirmModal
        visible={confirmEliminar !== null}
        title="Eliminar usuario"
        message="¿Seguro que queres eliminar este usuario? Esta accion no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmEliminar !== null) {
            eliminar(confirmEliminar);
            setConfirmEliminar(null);
          }
        }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </>
  );
}

export default Usuarios;
