import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { User, Camera, Save } from "lucide-react";

function avatarUrl(avatar?: string): string {
  if (!avatar) return "";
  return `http://localhost:3001/${avatar}`;
}

function Perfil() {
  const { usuario, token, updateUser } = useAuth();
  const toast = useToast();

  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardarCambios(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token || !usuario) return;

    if (passwordNuevo && passwordNuevo !== passwordConfirmar) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    setGuardando(true);
    try {
      const body: any = { nombre };
      if (passwordNuevo) {
        body.password = passwordNuevo;
      }

      const res = await fetch(`http://localhost:3001/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al guardar");
      }

      const actualizado = await res.json();
      updateUser({ ...usuario, nombre: actualizado.nombre });
      toast.addToast("Perfil actualizado correctamente", "success");
      setPasswordNuevo("");
      setPasswordConfirmar("");
    } catch (err: any) {
      setError(err.message || "Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !usuario) return;

    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`http://localhost:3001/usuarios/${usuario.id}/avatar`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Error al subir avatar");
      const data = await res.json();
      updateUser({ ...usuario, avatar: data.avatar });
      toast.addToast("Avatar actualizado", "success");
    } catch {
      toast.addToast("Error al subir el avatar", "error");
    }
  }

  return (
    <div className="perfil-page">
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div className="perfil-container">
        <div className="perfil-avatar-section">
          <div className="perfil-avatar-wrapper">
            {usuario?.avatar ? (
              <img src={avatarUrl(usuario.avatar)} alt={usuario.nombre} className="perfil-avatar-img" />
            ) : (
              <div className="perfil-avatar-placeholder">
                <User size={48} />
              </div>
            )}
            <label className="perfil-avatar-btn" title="Cambiar foto">
              <Camera size={16} />
              <input type="file" accept="image/*" onChange={cambiarAvatar} hidden />
            </label>
          </div>
          <div className="perfil-info">
            <h3>{usuario?.nombre}</h3>
            <span className="perfil-username">@{usuario?.username}</span>
            <span className={`rol-badge ${usuario?.rol === "admin" ? "rol-admin" : "rol-usuario"}`}>
              {usuario?.rol}
            </span>
          </div>
        </div>

        <form className="perfil-form" onSubmit={guardarCambios}>
          {error && <p className="error">{error}</p>}

          <div className="form-group">
            <label>Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="perfil-divider">
            <span>Cambiar contraseña</span>
          </div>

          <div className="form-group">
            <label>Contraseña nueva</label>
            <input
              type="password"
              value={passwordNuevo}
              onChange={(e) => setPasswordNuevo(e.target.value)}
              placeholder="Dejar en blanco para no cambiar"
            />
          </div>

          <div className="form-group">
            <label>Confirmar contraseña nueva</label>
            <input
              type="password"
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
              placeholder="Repetir contraseña nueva"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primario" disabled={guardando}>
              <Save size={16} /> {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Perfil;
