import { useState, useRef, useEffect } from "react";
import { Bell, X, AlertCircle, CheckCircle, Info } from "lucide-react";

interface Notificacion {
  id: number;
  tipo: "error" | "warning" | "success" | "info";
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export function useNotificaciones() {
  const [notifs, setNotifs] = useState<Notificacion[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("portal-notificaciones") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("portal-notificaciones", JSON.stringify(notifs));
  }, [notifs]);

  function agregar(titulo: string, mensaje: string, tipo: Notificacion["tipo"] = "info") {
    const nueva: Notificacion = {
      id: Date.now(),
      tipo,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false,
    };
    setNotifs((prev) => [nueva, ...prev].slice(0, 50));
  }

  function marcarLeida(id: number) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
  }

  function marcarTodasLeidas() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  function eliminar(id: number) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function limpiar() {
    setNotifs([]);
  }

  const noLeidas = notifs.filter((n) => !n.leida).length;

  return { notifs, noLeidas, agregar, marcarLeida, marcarTodasLeidas, eliminar, limpiar };
}

export function NotificationBell() {
  const { notifs, noLeidas, marcarLeida, marcarTodasLeidas, eliminar } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (abierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [abierto]);

  function formatearFecha(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function iconoTipo(tipo: string) {
    switch (tipo) {
      case "error": return <AlertCircle size={14} className="notif-icon-error" />;
      case "success": return <CheckCircle size={14} className="notif-icon-success" />;
      default: return <Info size={14} className="notif-icon-info" />;
    }
  }

  return (
    <div className="notification-bell-container">
      <button ref={btnRef} className="notification-bell-btn" onClick={() => setAbierto(!abierto)} title="Notificaciones">
        <Bell size={18} />
        {noLeidas > 0 && <span className="notification-badge">{noLeidas}</span>}
      </button>

      {abierto && (
        <div className="notification-dropdown" style={{ top: pos.top, left: pos.left }}>
          <div className="notification-header">
            <span>Notificaciones</span>
            {notifs.length > 0 && (
              <button className="notification-marcar" onClick={marcarTodasLeidas}>Marcar todas</button>
            )}
          </div>
          <div className="notification-list">
            {notifs.length === 0 ? (
              <div className="notification-empty">No hay notificaciones</div>
            ) : (
              notifs.slice(0, 10).map((n) => (
                <div key={n.id} className={`notification-item ${n.leida ? "leida" : ""}`} onClick={() => marcarLeida(n.id)}>
                  <div className="notification-item-icon">{iconoTipo(n.tipo)}</div>
                  <div className="notification-item-body">
                    <div className="notification-item-title">{n.titulo}</div>
                    <div className="notification-item-msg">{n.mensaje}</div>
                    <div className="notification-item-date">{formatearFecha(n.fecha)}</div>
                  </div>
                  <button className="notification-item-close" onClick={(e) => { e.stopPropagation(); eliminar(n.id); }}>
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
