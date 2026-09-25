import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Search,
  User,
  Clock,
  RotateCcw,
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import OrdenSelector from "../components/OrdenSelector";
import { usePagination } from "../hooks/usePagination";
import { useSort } from "../hooks/useSort";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface LogEntry {
  id: number;
  fecha: string;
  nivel: "info" | "success" | "warning" | "error";
  accion: string;
  usuario?: string;
  detalle?: string;
  extra?: string;
  ip?: string;
}

interface Resumen {
  total: number;
  porNivel: Record<string, number>;
  ultimo: string | null;
}

function Logs() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const [logsResp, resumenResp] = await Promise.all([
        fetch("http://localhost:3001/logs"),
        fetch("http://localhost:3001/logs/resumen"),
      ]);
      if (!logsResp.ok) throw new Error("Error al cargar logs");
      const datos = await logsResp.json();
      setLogs(datos);
      if (resumenResp.ok) setResumen(await resumenResp.json());
    } catch {
      setError("No se pudieron cargar los logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Auto-refresco cada 10s si esta activo
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(cargar, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, cargar]);

  async function limpiarLogs() {
    const token = localStorage.getItem("token");
    if (!token) { toast.addToast("No hay sesion activa", "warning"); return; }
    try {
      const res = await fetch("http://localhost:3001/logs", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.addToast("Error al limpiar los logs", "error"); return; }
      const data = await res.json();
      setLogs([]);
      setResumen({ total: 0, porNivel: { info: 0, success: 0, warning: 0, error: 0 }, ultimo: null });
      setConfirmLimpiar(false);
      toast.addToast(`${data.eliminados} registro(s) eliminado(s)`, "success");
    } catch {
      toast.addToast("Error de conexion con el servidor", "error");
    }
  }

  const nivelesUnicos = ["info", "success", "warning", "error"];

  const filtrados = logs.filter((l) => {
    const coincideNivel = nivelFiltro ? l.nivel === nivelFiltro : true;
    if (!coincideNivel) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      l.accion?.toLowerCase().includes(q) ||
      l.usuario?.toLowerCase().includes(q) ||
      l.detalle?.toLowerCase().includes(q)
    );
  });

  const ord = useSort(filtrados, "fecha", "desc");
  const pag = usePagination(ord.itemsOrdenados, {
    porPagina: 15,
    reiniciarEn: `${nivelFiltro}|${busqueda}|${ord.campo}|${ord.dir}`,
  });

  const iconoNivel = (nivel: string) => {
    switch (nivel) {
      case "success": return <CheckCircle size={15} className="log-icon-success" />;
      case "error": return <AlertCircle size={15} className="log-icon-error" />;
      case "warning": return <AlertTriangle size={15} className="log-icon-warning" />;
      default: return <Info size={15} className="log-icon-info" />;
    }
  };

  function formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-PY", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  return (
    <>
      <div className="logs-page">
        <div className="page-header">
          <h1>Registro de actividad</h1>
          <div className="header-actions">
            <button
              className={`btn-refresh ${autoRefresh ? "activo" : ""}`}
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Desactivar auto-refresco" : "Auto-refrescar cada 10s"}
            >
              <Activity size={14} /> {autoRefresh ? "En vivo" : "Auto"}
            </button>
            <button className="btn-refresh" onClick={cargar} title="Refrescar ahora">
              <RefreshCw size={14} /> Refrescar
            </button>
            {usuario?.rol === "admin" && logs.length > 0 && (
              <button className="btn-danger" onClick={() => setConfirmLimpiar(true)} title="Eliminar todo el historial">
                <Trash2 size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {resumen && (
          <div className="logs-resumen">
            <div className="logs-stat">
              <span className="logs-stat-valor">{resumen.total}</span>
              <span className="logs-stat-label">Registros</span>
            </div>
            <div className="logs-stat nivel-info">
              <span className="logs-stat-valor">{resumen.porNivel.info ?? 0}</span>
              <span className="logs-stat-label">Info</span>
            </div>
            <div className="logs-stat nivel-success">
              <span className="logs-stat-valor">{resumen.porNivel.success ?? 0}</span>
              <span className="logs-stat-label">Exito</span>
            </div>
            <div className="logs-stat nivel-warning">
              <span className="logs-stat-valor">{resumen.porNivel.warning ?? 0}</span>
              <span className="logs-stat-label">Advertencias</span>
            </div>
            <div className="logs-stat nivel-error">
              <span className="logs-stat-valor">{resumen.porNivel.error ?? 0}</span>
              <span className="logs-stat-label">Errores</span>
            </div>
          </div>
        )}

        <div className="logs-filtros">
          <div className="filtro-container">
            <label>Nivel:</label>
            <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
              <option value="">Todos</option>
              {nivelesUnicos.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="logs-busqueda">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por accion, usuario o detalle..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <OrdenSelector
          opciones={[
            { campo: "fecha", label: "Fecha" },
            { campo: "nivel", label: "Nivel" },
            { campo: "accion", label: "Accion" },
            { campo: "usuario", label: "Usuario" },
          ]}
          campoActivo={ord.campo}
          dir={ord.dir}
          onOrdenar={ord.ordenarPor}
        />

        {loading && <p className="loading">Cargando registros...</p>}

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

        {!loading && !error && (
          <>
            {filtrados.length === 0 ? (
              <div className="logs-vacio">
                <Activity size={32} />
                <p>No hay registros de actividad{logs.length > 0 ? " con esos filtros" : " aun"}.</p>
              </div>
            ) : (
              <div className="logs-tabla-wrap">
                <table className="logs-tabla">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Fecha</th>
                      <th>Accion</th>
                      <th>Usuario</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pag.itemsPagina.map((log) => (
                      <tr key={log.id} className={`log-row log-row-${log.nivel}`}>
                        <td className="log-celda-icono">{iconoNivel(log.nivel)}</td>
                        <td className="log-celda-fecha">
                          <Clock size={11} /> {formatearFecha(log.fecha)}
                        </td>
                        <td>
                          <span className={`log-accion log-accion-${log.nivel}`}>{log.accion}</span>
                        </td>
                        <td className="log-celda-usuario">
                          {log.usuario ? (<><User size={11} /> {log.usuario}</>) : "—"}
                        </td>
                        <td className="log-celda-detalle" title={log.detalle}>{log.detalle ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination pag={pag} etiqueta="registros" />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        visible={confirmLimpiar}
        title="Limpiar historial"
        message={`Se eliminaran los ${logs.length} registros de actividad. Esta accion no se puede deshacer.`}
        confirmText="Eliminar todo"
        onConfirm={limpiarLogs}
        onCancel={() => setConfirmLimpiar(false)}
      />
    </>
  );
}

export default Logs;
