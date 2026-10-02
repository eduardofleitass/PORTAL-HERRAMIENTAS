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
  Eye,
  X,
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

const NOMBRES_ACCION: Record<string, string> = {
  // Sesion
  login: "Inicio de sesion",
  login_fallido: "Login fallido",
  logout: "Cierre de sesion",
  crear_sesion: "Sesion creada",
  crear_sesion_fallido: "Creacion de sesion fallida",
  cerrar_sesion: "Cierre de sesion",

  // Procedimientos
  procedimiento_creado: "Procedimiento creado",
  procedimiento_actualizado: "Procedimiento actualizado",
  procedimiento_eliminado: "Procedimiento eliminado",
  crear_procedimiento: "Procedimiento creado",
  editar_procedimiento: "Procedimiento editado",
  eliminar_procedimiento: "Procedimiento eliminado",

  // Errores
  error_creado: "Error registrado",
  error_actualizado: "Error actualizado",
  error_eliminado: "Error eliminado",
  crear_error: "Error registrado",
  editar_error: "Error editado",
  eliminar_error: "Error eliminado",

  // Documentos
  documento_subido: "Documento subido",
  documento_actualizado: "Documento actualizado",
  documento_eliminado: "Documento eliminado",
  crear_documento: "Documento subido",
  crear_documento_fallido: "Subida de documento fallida",
  editar_documento: "Documento editado",
  eliminar_documento: "Documento eliminado",

  // Usuarios
  usuario_creado: "Usuario creado",
  usuario_actualizado: "Usuario actualizado",
  usuario_eliminado: "Usuario eliminado",
  crear_usuario: "Usuario creado",
  editar_usuario: "Usuario editado",
  eliminar_usuario: "Usuario eliminado",

  // Errores de la app
  error_frontend: "Error de interfaz",
  error_backend: "Error de servidor",
};

function Logs() {
  const { usuario, token } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [accionFiltro, setAccionFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logSeleccionado, setLogSeleccionado] = useState<LogEntry | null>(null);
  const [tabDetalle, setTabDetalle] = useState<"resumen" | "tecnico">("resumen");

  function traducirDetalle(detalle: string | undefined, accion: string): string {
    if (!detalle) return "Sin informacion adicional.";
    
    // Patrones comunes de logs
    if (detalle.includes("POST /auth/login")) return "Alguien ingreso al sistema con su usuario y contrasena.";
    if (detalle.includes("POST /auth/logout")) return "Alguien cerro su sesion y salio del sistema.";
    if (detalle.includes("ReferenceError")) return "La aplicacion intento usar algo que no existe o no esta disponible.";
    if (detalle.includes("TypeError")) return "Hubo un problema con el tipo de dato que se estaba usando.";
    if (detalle.includes("SyntaxError")) return "Hay un error de escritura en el codigo de la aplicacion.";
    if (detalle.includes("NetworkError") || detalle.includes("fetch") || detalle.includes("Failed to fetch")) return "La aplicacion no pudo conectarse con el servidor. Verifique su conexion a internet.";
    if (detalle.includes("500") || detalle.includes("Internal Server Error")) return "El servidor tuvo un problema interno al procesar la solicitud.";
    if (detalle.includes("404") || detalle.includes("Not Found")) return "La aplicacion busco algo que no existe en el servidor.";
    if (detalle.includes("403") || detalle.includes("Forbidden")) return "El usuario no tiene permisos para realizar esta accion.";
    if (detalle.includes("401") || detalle.includes("Unauthorized")) return "La sesion expiro o el usuario no esta identificado.";
    if (detalle.includes("PATCH")) {
      const match = detalle.match(/PATCH \/([^\/]+)\/(\d+)/);
      if (match) {
        const entidad = match[1].replace(/s$/, "").replace(/_/g, " ");
        return `Se edito un ${entidad} existente en el sistema.`;
      }
      return "Se actualizo informacion en el sistema.";
    }
    if (detalle.includes("POST")) {
      const match = detalle.match(/POST \/([^\/]+)/);
      if (match) {
        const entidad = match[1].replace(/s$/, "").replace(/_/g, " ");
        return `Se creo un nuevo ${entidad} en el sistema.`;
      }
      return "Se registro nueva informacion en el sistema.";
    }
    if (detalle.includes("DELETE")) {
      const match = detalle.match(/DELETE \/([^\/]+)\/(\d+)/);
      if (match) {
        const entidad = match[1].replace(/s$/, "").replace(/_/g, " ");
        return `Se elimino un ${entidad} del sistema.`;
      }
      return "Se elimino informacion del sistema.";
    }
    if (detalle.includes("GET")) return "Alguien consulto informacion en el sistema.";
    
    // Fallback por tipo de accion
    if (accion === "login") return "Se inicio sesion en el sistema.";
    if (accion === "logout") return "Se cerro la sesion.";
    if (accion.includes("creado")) return "Se creo un nuevo registro.";
    if (accion.includes("actualizado")) return "Se modifico un registro existente.";
    if (accion.includes("eliminado")) return "Se elimino un registro.";
    if (accion.includes("error")) return "Ocurrio un error en el sistema.";
    
    return detalle;
  }

  const cargar = useCallback(async () => {
    setError("");
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const [logsResp, resumenResp] = await Promise.all([
        fetch("http://localhost:3001/logs", { headers }),
        fetch("http://localhost:3001/logs/resumen", { headers }),
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
  }, [token]);

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
    const coincideAccion = accionFiltro ? l.accion === accionFiltro : true;
    if (!coincideAccion) return false;
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
    reiniciarEn: `${nivelFiltro}|${accionFiltro}|${busqueda}|${ord.campo}|${ord.dir}`,
  });

  /** Conteos por nivel calculados sobre los logs con filtro de accion/busqueda aplicado
   *  (asi las tarjetas reflejan lo que realmente se puede filtrar) */
  const conteosNivel = (() => {
    const base = logs.filter((l) => {
      const coincideAccion = accionFiltro ? l.accion === accionFiltro : true;
      if (!coincideAccion) return false;
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        l.accion?.toLowerCase().includes(q) ||
        l.usuario?.toLowerCase().includes(q) ||
        l.detalle?.toLowerCase().includes(q)
      );
    });
    const c: { info: number; success: number; warning: number; error: number; total: number } = {
      info: 0, success: 0, warning: 0, error: 0, total: 0,
    };
    for (const l of base) {
      if (l.nivel in c) c[l.nivel] += 1;
    }
    c.total = base.length;
    return c;
  })();

  /** Alterna el filtro de nivel. Click en el mismo valor lo quita. */
  function alternarNivel(nivel: string) {
    setNivelFiltro((prev) => (prev === nivel ? "" : nivel));
  }

  /** Alterna el filtro por tipo de accion. Click en el mismo chip lo quita. */
  function alternarAccion(accion: string) {
    setAccionFiltro((prev) => (prev === accion ? "" : accion));
  }

  const hayFiltrosActivos = Boolean(nivelFiltro || accionFiltro || busqueda.trim());

  function limpiarFiltros() {
    setNivelFiltro("");
    setAccionFiltro("");
    setBusqueda("");
  }

  const iconoNivel = (nivel: string) => {
    switch (nivel) {
      case "success": return <CheckCircle size={15} className="log-icon-success" />;
      case "error": return <AlertCircle size={15} className="log-icon-error" />;
      case "warning": return <AlertTriangle size={15} className="log-icon-warning" />;
      default: return <Info size={15} className="log-icon-info" />;
    }
  };

  function nombreAccion(accion: string): string {
    return NOMBRES_ACCION[accion] || accion;
  }

  function resumenPorAccion(logsList: LogEntry[]) {
    const map: Record<string, { label: string; count: number; nivel: string }> = {};
    for (const l of logsList) {
      if (!map[l.accion]) {
        map[l.accion] = { label: nombreAccion(l.accion), count: 0, nivel: l.nivel };
      }
      map[l.accion].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }

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
            <button
              className={`logs-stat logs-stat-clickable ${!nivelFiltro ? "logs-stat-activa" : ""}`}
              onClick={() => alternarNivel("")}
              title={nivelFiltro ? "Quitar filtro de nivel" : "Ver todos los registros"}
            >
              <span className="logs-stat-valor">{conteosNivel.total}</span>
              <span className="logs-stat-label">Registros</span>
            </button>
            <button
              className={`logs-stat logs-stat-clickable nivel-info ${nivelFiltro === "info" ? "logs-stat-activa" : ""}`}
              onClick={() => alternarNivel("info")}
              title="Filtrar solo informativos"
            >
              <span className="logs-stat-valor">{conteosNivel.info ?? 0}</span>
              <span className="logs-stat-label">Info</span>
            </button>
            <button
              className={`logs-stat logs-stat-clickable nivel-success ${nivelFiltro === "success" ? "logs-stat-activa" : ""}`}
              onClick={() => alternarNivel("success")}
              title="Filtrar solo exitos"
            >
              <span className="logs-stat-valor">{conteosNivel.success ?? 0}</span>
              <span className="logs-stat-label">Exito</span>
            </button>
            <button
              className={`logs-stat logs-stat-clickable nivel-warning ${nivelFiltro === "warning" ? "logs-stat-activa" : ""}`}
              onClick={() => alternarNivel("warning")}
              title="Filtrar solo advertencias"
            >
              <span className="logs-stat-valor">{conteosNivel.warning ?? 0}</span>
              <span className="logs-stat-label">Advertencias</span>
            </button>
            <button
              className={`logs-stat logs-stat-clickable nivel-error ${nivelFiltro === "error" ? "logs-stat-activa" : ""}`}
              onClick={() => alternarNivel("error")}
              title="Filtrar solo errores"
            >
              <span className="logs-stat-valor">{conteosNivel.error ?? 0}</span>
              <span className="logs-stat-label">Errores</span>
            </button>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className="logs-acciones-resumen">
            <div className="logs-acciones-titulo">
              Actividad reciente
              {accionFiltro && (
                <span className="logs-acciones-subtitulo">
                  (filtrando: {nombreAccion(accionFiltro)})
                </span>
              )}
            </div>
            <div className="logs-acciones-lista">
              {resumenPorAccion(filtrados).slice(0, 6).map((item) => {
                const accionKey = Object.keys(NOMBRES_ACCION).find(
                  (k) => NOMBRES_ACCION[k] === item.label
                ) || item.label;
                const activo = accionFiltro === accionKey;
                return (
                  <button
                    key={item.label}
                    className={`logs-accion-chip nivel-${item.nivel} logs-accion-chip-clickable ${activo ? "logs-accion-chip-activa" : ""}`}
                    onClick={() => alternarAccion(accionKey)}
                    title={activo ? "Quitar filtro" : `Filtrar por "${item.label}"`}
                  >
                    <span className="logs-accion-chip-label">{item.label}</span>
                    <span className="logs-accion-chip-count">{item.count}</span>
                  </button>
                );
              })}
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
          {hayFiltrosActivos && (
            <button className="btn-limpiar-filtros" onClick={limpiarFiltros} title="Quitar todos los filtros">
              <X size={14} /> Limpiar filtros
            </button>
          )}
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
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pag.itemsPagina.map((log) => (
                      <tr
                        key={log.id}
                        className={`log-row log-row-${log.nivel} log-row-clickable`}
                        onClick={() => setLogSeleccionado(log)}
                        title="Ver detalle"
                      >
                        <td className="log-celda-icono">{iconoNivel(log.nivel)}</td>
                        <td className="log-celda-fecha">
                          <Clock size={11} /> {formatearFecha(log.fecha)}
                        </td>
                        <td>
                          <span className={`log-accion log-accion-${log.nivel}`}>{nombreAccion(log.accion)}</span>
                        </td>
                        <td className="log-celda-usuario">
                          {log.usuario ? (<><User size={11} /> {log.usuario}</>) : "—"}
                        </td>
                        <td className="log-celda-ver">
                          <Eye size={14} />
                        </td>
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

      {/* Modal de detalle del log */}
      {logSeleccionado && (
        <div className="modal-overlay" onClick={() => setLogSeleccionado(null)}>
          <div className="modal-content log-detalle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="log-detalle-titulo">
                {iconoNivel(logSeleccionado.nivel)}
                <span>{nombreAccion(logSeleccionado.accion)}</span>
              </div>
              <button className="btn-cerrar-detalle" onClick={() => setLogSeleccionado(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="log-detalle-body">
              <div className="log-detalle-grid">
                <div className="log-detalle-item">
                  <label>Fecha</label>
                  <span>{formatearFecha(logSeleccionado.fecha)}</span>
                </div>
                <div className="log-detalle-item">
                  <label>Nivel</label>
                  <span className={`log-accion log-accion-${logSeleccionado.nivel}`}>
                    {logSeleccionado.nivel}
                  </span>
                </div>
                <div className="log-detalle-item">
                  <label>Usuario</label>
                  <span>{logSeleccionado.usuario || "—"}</span>
                </div>
                <div className="log-detalle-item">
                  <label>IP</label>
                  <span>{logSeleccionado.ip || "—"}</span>
                </div>
              </div>

              <div className="log-detalle-tabs">
                <button
                  className={tabDetalle === "resumen" ? "activo" : ""}
                  onClick={() => setTabDetalle("resumen")}
                >
                  Resumen (simple)
                </button>
                <button
                  className={tabDetalle === "tecnico" ? "activo" : ""}
                  onClick={() => setTabDetalle("tecnico")}
                >
                  Tecnico
                </button>
              </div>

              {tabDetalle === "resumen" ? (
                <div className="log-detalle-seccion">
                  <label>Que paso</label>
                  <p className="log-detalle-resumen">
                    {traducirDetalle(logSeleccionado.detalle, logSeleccionado.accion)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="log-detalle-seccion">
                    <label>Detalle tecnico</label>
                    <pre>{logSeleccionado.detalle || "Sin detalle"}</pre>
                  </div>
                  {logSeleccionado.extra && (
                    <div className="log-detalle-seccion">
                      <label>Informacion adicional (stack trace)</label>
                      <pre>{logSeleccionado.extra}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
