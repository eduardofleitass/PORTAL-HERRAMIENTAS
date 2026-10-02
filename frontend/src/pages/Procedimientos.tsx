import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { useNotificaciones } from "../context/NotificationContext";
import { usePermisos, puedeRealizarAccion } from "../context/AuthContext";
import { Pencil, Trash2, RotateCcw, Printer, Search } from "lucide-react";
import { exportarPDFProcedimientos } from "../utils/exportPDF";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import { usePagination } from "../hooks/usePagination";
import { useSort } from "../hooks/useSort";
import OrdenSelector from "../components/OrdenSelector";
import { api } from "../config/api";

interface Paso {
  orden: number;
  descripcion: string;
}

interface Procedimiento {
  id: number;
  titulo: string;
  pasos: Paso[];
  modulo: string;
  nivel: string;
  tiempo_estimado: string;
}

function Procedimientos() {
  const toast = useToast();
  const permisos = usePermisos();
  const { agregar: notificar } = useNotificaciones();

  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [seleccionado, setSeleccionado] = useState<Procedimiento | null>(null);
  const [moduloFiltro, setModuloFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState("basico");
  const [nuevoTiempo, setNuevoTiempo] = useState("");
  const [nuevosPasos, setNuevosPasos] = useState<Paso[]>([{ orden: 1, descripcion: "" }]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const respuesta = await fetch(api("/procedimientos"), {
        headers: token ? { Authorization: "Bearer " + token } : {}
      });
      const datos = await respuesta.json();
      setProcedimientos(datos);
    } catch (err) {
      setError("No se pudieron cargar los procedimientos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && seleccionado) setSeleccionado(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [seleccionado]);

  const modulosUnicos = Array.from(new Set(procedimientos.map((p) => p.modulo)));

  const filtrados = procedimientos.filter((p) => {
    const coincideModulo = moduloFiltro ? p.modulo === moduloFiltro : true;
    if (!coincideModulo) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      p.titulo?.toLowerCase().includes(q) ||
      p.modulo?.toLowerCase().includes(q) ||
      p.nivel?.toLowerCase().includes(q) ||
      p.tiempo_estimado?.toLowerCase().includes(q)
    );
  });
  const ord = useSort(filtrados, "titulo");
  const pag = usePagination(ord.itemsOrdenados, { porPagina: 8, reiniciarEn: `${moduloFiltro}|${busqueda}|${ord.campo}|${ord.dir}` });

  function agregarPaso() {
    setNuevosPasos((prev) => [...prev, { orden: prev.length + 1, descripcion: "" }]);
  }
  function cambiarPaso(index: number, descripcion: string) {
    setNuevosPasos((prev) => prev.map((p, i) => (i === index ? { ...p, descripcion } : p)));
  }
  function quitarPaso(index: number) {
    setNuevosPasos((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i + 1 })));
  }

  async function guardarProcedimiento(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGuardar("");
    setGuardando(true);

    const token = localStorage.getItem("token");
    if (!token) { setErrorGuardar("No hay sesion."); setGuardando(false); return; }

    try {
      const respuesta = await fetch(api("/procedimientos"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          titulo: nuevoTitulo, modulo: nuevoModulo, nivel: nuevoNivel,
          tiempo_estimado: nuevoTiempo, pasos: nuevosPasos.filter((p) => p.descripcion.trim() !== "")
        })
      });
      if (!respuesta.ok) { const datos = await respuesta.json(); setErrorGuardar(datos.message || "Error"); setGuardando(false); return; }
      const creado = await respuesta.json();
      setProcedimientos((prev) => [...prev, creado]);
      cerrarFormulario();
      toast.addToast("Procedimiento creado correctamente", "success");
      notificar("Procedimiento creado", `Se creo el procedimiento "${nuevoTitulo}"`, "success");
    } catch { setErrorGuardar("Error de conexion"); }
    finally { setGuardando(false); }
  }

  function iniciarEdicion(proc: Procedimiento) {
    setEditandoId(proc.id);
    setNuevoTitulo(proc.titulo);
    setNuevoModulo(proc.modulo);
    setNuevoNivel(proc.nivel);
    setNuevoTiempo(proc.tiempo_estimado);
    setNuevosPasos(proc.pasos.length > 0 ? proc.pasos : [{ orden: 1, descripcion: "" }]);
    setMostrarFormulario(true);
    setSeleccionado(null);
  }

  async function guardarEdicion(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editandoId) return;
    setErrorGuardar("");
    setGuardando(true);

    const token = localStorage.getItem("token");
    if (!token) { setErrorGuardar("No hay sesion."); setGuardando(false); return; }

    try {
      const respuesta = await fetch(api(`/procedimientos/${editandoId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          titulo: nuevoTitulo, modulo: nuevoModulo, nivel: nuevoNivel,
          tiempo_estimado: nuevoTiempo, pasos: nuevosPasos.filter((p) => p.descripcion.trim() !== "")
        })
      });
      if (!respuesta.ok) { const datos = await respuesta.json(); setErrorGuardar(datos.message || "Error"); setGuardando(false); return; }
      const actualizado = await respuesta.json();
      setProcedimientos((prev) => prev.map((p) => p.id === editandoId ? actualizado : p));
      cerrarFormulario();
      toast.addToast("Cambios guardados", "success");
      notificar("Procedimiento editado", `Se edito el procedimiento "${nuevoTitulo}"`, "info");
    } catch { setErrorGuardar("Error de conexion"); }
    finally { setGuardando(false); }
  }

  async function eliminarProcedimiento(id: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const respuesta = await fetch(api(`/procedimientos/${id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!respuesta.ok) { toast.addToast("Error al eliminar el procedimiento", "error"); return; }
      setProcedimientos((prev) => prev.filter((p) => p.id !== id));
      setSeleccionado(null);
      toast.addToast("Procedimiento eliminado", "success");
      notificar("Procedimiento eliminado", "Se elimino un procedimiento del sistema", "warning");
    } catch { toast.addToast("Error de conexion con el servidor", "error"); }
  }

  function cerrarFormulario() {
    setNuevoTitulo(""); setNuevoModulo(""); setNuevoNivel("basico");
    setNuevoTiempo(""); setNuevosPasos([{ orden: 1, descripcion: "" }]);
    setMostrarFormulario(false); setEditandoId(null); setErrorGuardar("");
  }


  return (
    <>
    <div className="procedimientos-page">
      <header className="page-header">
        <h1>Procedimientos</h1>
      </header>

      {mostrarFormulario ? (
        <form className="formulario-procedimiento" onSubmit={editandoId ? guardarEdicion : guardarProcedimiento}>
          <h3>{editandoId ? "Editar Procedimiento" : "Nuevo Procedimiento"}</h3>
          {errorGuardar && <p className="error">{errorGuardar}</p>}
          <div className="form-grupo"><label>Titulo:</label>
            <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} required />
          </div>
          <div className="form-grupo"><label>Modulo:</label>
            <input type="text" value={nuevoModulo} onChange={(e) => setNuevoModulo(e.target.value)} required />
          </div>
          <div className="form-grupo"><label>Nivel:</label>
            <select value={nuevoNivel} onChange={(e) => setNuevoNivel(e.target.value)}>
              <option value="basico">Basico</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option>
            </select>
          </div>
          <div className="form-grupo"><label>Tiempo estimado:</label>
            <input type="text" value={nuevoTiempo} onChange={(e) => setNuevoTiempo(e.target.value)} required />
          </div>
          <div className="form-pasos">
            <label>Pasos:</label>
            {nuevosPasos.map((paso, index) => (
              <div key={index} className="paso-input">
                <span>{paso.orden}.</span>
                <input type="text" value={paso.descripcion} onChange={(e) => cambiarPaso(index, e.target.value)} placeholder={`Descripcion del paso`} />
                {nuevosPasos.length > 1 && <button type="button" onClick={() => quitarPaso(index)}>X</button>}
              </div>
            ))}
            <button type="button" className="btn-agregar" onClick={agregarPaso}>+ Agregar paso</button>
          </div>
          <div className="form-botones">
            <button type="submit" disabled={guardando}>{guardando ? "Guardando..." : (editandoId ? "Actualizar" : "Guardar")}</button>
            <button type="button" className="btn-cancelar" onClick={cerrarFormulario}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="split-layout">
          <div className="split-list">
            {!loading && puedeRealizarAccion(permisos, "crear") && (
              <button className="btn-nuevo" onClick={() => setMostrarFormulario(true)}>+ Nuevo Procedimiento</button>
            )}
            <div className="filtros-row">
              <div className="filtro-container">
                <label>Filtrar por modulo:</label>
                <select value={moduloFiltro} onChange={(e) => { setModuloFiltro(e.target.value); setSeleccionado(null); }}>
                  <option value="">Todos los modulos</option>
                  {modulosUnicos.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="busqueda-container">
                <Search size={14} />
                <input
                  type="text"
                  className="busqueda-input"
                  placeholder="Buscar por titulo, modulo, nivel..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              
              {puedeRealizarAccion(permisos, "exportarPDF") && (
                <button className="btn-exportar" onClick={() => exportarPDFProcedimientos(procedimientos)} title="Imprimir / Exportar PDF">
                  <Printer size={14} /> PDF
                </button>
              )}
            </div>
            <OrdenSelector
              opciones={[
                { campo: "titulo", label: "Titulo" },
                { campo: "modulo", label: "Modulo" },
                { campo: "nivel", label: "Nivel" },
                { campo: "tiempo_estimado", label: "Tiempo estimado" },
              ]}
              campoActivo={ord.campo}
              dir={ord.dir}
              onOrdenar={ord.ordenarPor}
            />
            {loading && <p className="loading">Cargando procedimientos...</p>}
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
              <div className="lista-procedimientos">
                {filtrados.length === 0 && <p>No hay procedimientos para este modulo.</p>}
                {pag.itemsPagina.map((proc) => (
                  <div key={proc.id} className={`procedimiento-item ${seleccionado?.id === proc.id ? "activo" : ""}`} onClick={() => setSeleccionado(proc)}>
                    <div className="item-contenido">
                      <h3>{proc.titulo}</h3>
                      <div className="procedimiento-meta">
                        <span className="modulo">{proc.modulo}</span>
                        <span className="nivel">{proc.nivel}</span>
                        <span className="tiempo">{proc.tiempo_estimado}</span>
                      </div>
                    </div>
                      <div className="item-acciones" onClick={(e) => e.stopPropagation()}>
                        {puedeRealizarAccion(permisos, "editar") && (<button className="btn-icon btn-icon-editar" title="Editar" onClick={() => iniciarEdicion(proc)}>
                          <Pencil size={16} />
                        </button>)}
                        {puedeRealizarAccion(permisos, "eliminar") && (<button className="btn-icon btn-icon-eliminar" title="Eliminar" onClick={() => setConfirmEliminar(proc.id)}>
                          <Trash2 size={16} />
                        </button>)}
                      </div>
                  </div>
                ))}
                <Pagination pag={pag} etiqueta="procedimientos" />
              </div>
            )}
          </div>
          <div className="split-detail">
            {seleccionado ? (
              <div className="detalle-procedimiento">
                <div className="detalle-header">
                  <h2>{seleccionado.titulo}</h2>
                  <button className="btn-cerrar-detalle" onClick={() => setSeleccionado(null)} title="Cerrar (ESC)">
                    ✕
                  </button>
                </div>
                <div className="detalle-meta">
                  <span>Modulo: {seleccionado.modulo}</span>
                  <span>Nivel: {seleccionado.nivel}</span>
                  <span>Tiempo: {seleccionado.tiempo_estimado}</span>
                  </div>
                  <h4>Pasos:</h4>
                  <ol className="pasos-lista">
                    {seleccionado.pasos.map((paso) => <li key={paso.orden}>{paso.descripcion}</li>)}
                  </ol>
              </div>
            ) : (
              <div className="split-empty">
                <p>Selecciona un procedimiento de la lista para ver su detalle.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      <ConfirmModal
        visible={confirmEliminar !== null}
        title="Eliminar procedimiento"
        message="¿Seguro que queres eliminar este procedimiento? Esta accion no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmEliminar !== null) {
            eliminarProcedimiento(confirmEliminar);
            setConfirmEliminar(null);
          }
        }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </>
  );
}

export default Procedimientos;
