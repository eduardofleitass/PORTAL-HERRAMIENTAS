import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Trash2, RotateCcw, Pencil } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import { usePagination } from "../hooks/usePagination";
import { useSort } from "../hooks/useSort";
import OrdenSelector from "../components/OrdenSelector";

interface Documento {
  id: number;
  titulo: string;
  descripcion: string;
  seccion: string;
  nombreArchivo: string;
  rutaArchivo: string;
  tamano: number;
  fechaSubida: string;
}

function Documentacion() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [seleccionado, setSeleccionado] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seccionFiltro, setSeccionFiltro] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [seccion, setSeccion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

  // Edicion
  const [editandoDoc, setEditandoDoc] = useState<Documento | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editSeccion, setEditSeccion] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const respuesta = await fetch("http://localhost:3001/documentacion");
      const datos = await respuesta.json();
      setDocumentos(datos);
    } catch { setError("No se pudieron cargar los documentos"); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && seleccionado) setSeleccionado(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [seleccionado]);

  const seccionesUnicas = Array.from(new Set(documentos.map((d) => d.seccion)));
  const filtrados = seccionFiltro ? documentos.filter((d) => d.seccion === seccionFiltro) : documentos;
  const ord = useSort(filtrados, "titulo");
  const pag = usePagination(ord.itemsOrdenados, { porPagina: 8, reiniciarEn: `${seccionFiltro}|${ord.campo}|${ord.dir}` });

  async function guardarDocumento(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGuardar(""); setGuardando(true);

    const token = localStorage.getItem("token");
    if (!token) { setErrorGuardar("No hay sesion."); setGuardando(false); return; }
    if (!archivo) { setErrorGuardar("Debe seleccionar un archivo"); setGuardando(false); return; }

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("titulo", titulo);
      formData.append("descripcion", descripcion);
      formData.append("seccion", seccion);

      const respuesta = await fetch("http://localhost:3001/documentacion", {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData
      });
      if (!respuesta.ok) { const datos = await respuesta.json(); setErrorGuardar(datos.message || "Error"); setGuardando(false); return; }
      const creado = await respuesta.json();
      setDocumentos((prev) => [...prev, creado]);
      setTitulo(""); setDescripcion(""); setSeccion(""); setArchivo(null); setMostrarFormulario(false);
      toast.addToast("Documento subido correctamente", "success");
    } catch { setErrorGuardar("Error de conexion"); }
    finally { setGuardando(false); }
  }

  async function eliminarDocumento(id: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const respuesta = await fetch(`http://localhost:3001/documentacion/${id}`, {
        method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
      });
      if (!respuesta.ok) { toast.addToast("Error al eliminar el documento", "error"); return; }
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
      setSeleccionado(null);
      toast.addToast("Documento eliminado", "success");
    } catch { toast.addToast("Error de conexion con el servidor", "error"); }
  }

  function iniciarEdicion(doc: Documento) {
    setEditandoDoc(doc);
    setEditTitulo(doc.titulo);
    setEditDescripcion(doc.descripcion);
    setEditSeccion(doc.seccion);
    setSeleccionado(null);
  }

  function cerrarEdicion() {
    setEditandoDoc(null);
    setEditTitulo("");
    setEditDescripcion("");
    setEditSeccion("");
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoDoc) return;
    const token = localStorage.getItem("token");
    if (!token) { toast.addToast("No hay sesion activa", "warning"); return; }
    setGuardando(true);
    try {
      const respuesta = await fetch(`http://localhost:3001/documentacion/${editandoDoc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ titulo: editTitulo, descripcion: editDescripcion, seccion: editSeccion })
      });
      if (!respuesta.ok) throw new Error("Error al actualizar");
      const actualizado = await respuesta.json();
      setDocumentos((prev) => prev.map((d) => d.id === editandoDoc.id ? actualizado : d));
      if (seleccionado?.id === editandoDoc.id) setSeleccionado(actualizado);
      cerrarEdicion();
      toast.addToast("Cambios guardados", "success");
    } catch {
      toast.addToast("Error al guardar los cambios", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
    <div className="documentacion-page">
      <header className="page-header">
        <h1>Documentacion</h1>
      </header>

      {mostrarFormulario ? (
        <form className="formulario-procedimiento" onSubmit={guardarDocumento}>
          <h3>Subir Documento</h3>
          {errorGuardar && <p className="error">{errorGuardar}</p>}
          <div className="form-grupo"><label>Titulo:</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>
          <div className="form-grupo"><label>Descripcion:</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="form-grupo"><label>Seccion:</label>
            <input type="text" value={seccion} onChange={(e) => setSeccion(e.target.value)} required placeholder="Ej: Manual de Sistemas" />
          </div>
          <div className="form-grupo"><label>Archivo:</label>
            <input type="file" onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)} required />
            {archivo && <p className="archivo-seleccionado">Seleccionado: {archivo.name}</p>}
          </div>
          <div className="form-botones">
            <button type="submit" disabled={guardando}>{guardando ? "Subiendo..." : "Subir"}</button>
            <button type="button" className="btn-cancelar" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="split-layout">
          <div className="split-list">
            {!loading && usuario?.rol === "admin" && (
              <button className="btn-nuevo" onClick={() => setMostrarFormulario(true)}>+ Subir Documento</button>
            )}
            <div className="filtro-container">
              <label>Filtrar por seccion:</label>
              <select value={seccionFiltro} onChange={(e) => { setSeccionFiltro(e.target.value); setSeleccionado(null); }}>
                <option value="">Todas las secciones</option>
                {seccionesUnicas.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <OrdenSelector
              opciones={[
                { campo: "titulo", label: "Titulo" },
                { campo: "seccion", label: "Seccion" },
                { campo: "nombreArchivo", label: "Archivo" },
                { campo: "tamano", label: "Tamano" },
                { campo: "fechaSubida", label: "Fecha" },
              ]}
              campoActivo={ord.campo}
              dir={ord.dir}
              onOrdenar={ord.ordenarPor}
            />
            {loading && <p className="loading">Cargando documentos...</p>}
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
              <div className="lista-documentos">
                {filtrados.length === 0 && <p>No hay documentos en esta seccion.</p>}
                {pag.itemsPagina.map((doc) => (
                  <div key={doc.id} className={`documento-item ${seleccionado?.id === doc.id ? "activo" : ""}`} onClick={() => setSeleccionado(doc)}>
                    <h3>{doc.titulo}</h3>
                    <p>{doc.descripcion}</p>
                    <div className="documento-meta">
                      <span className="seccion">{doc.seccion}</span>
                      <span>{doc.nombreArchivo}</span>
                      <span>{(doc.tamano / 1024).toFixed(1)} KB</span>
                    </div>
                    {usuario?.rol === "admin" && (
                    <div className="documento-acciones">
                      <button className="btn-icon btn-icon-editar" title="Editar" onClick={(e) => { e.stopPropagation(); iniciarEdicion(doc); }}>
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon btn-icon-eliminar" title="Eliminar" onClick={(e) => { e.stopPropagation(); setConfirmEliminar(doc.id); }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    )}
                  </div>
                ))}
                <Pagination pag={pag} etiqueta="documentos" />
              </div>
            )}
          </div>
          <div className="split-detail">
            {seleccionado ? (
              <div className="detalle-documento">
                <div className="detalle-header">
                  <h2>{seleccionado.titulo}</h2>
                  <button className="btn-cerrar-detalle" onClick={() => setSeleccionado(null)} title="Cerrar (ESC)">
                    ✕
                  </button>
                </div>
                <p className="detalle-descripcion">{seleccionado.descripcion}</p>
                <div className="detalle-meta">
                  <span className="seccion">{seleccionado.seccion}</span>
                  <span>{seleccionado.nombreArchivo}</span>
                  <span>{(seleccionado.tamano / 1024).toFixed(1)} KB</span>
                </div>
                <a href={`http://localhost:3001${seleccionado.rutaArchivo}`} target="_blank" rel="noopener noreferrer" className="btn-descargar">
                  Ver
                </a>
              </div>
            ) : (
              <div className="split-empty">
                <p>Selecciona un documento de la lista para ver su detalle.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Modal de edicion de documento */}
      {editandoDoc && (
        <div className="modal-overlay" onClick={cerrarEdicion}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Documento</h2>
              <button className="btn-cerrar-detalle" onClick={cerrarEdicion}>✕</button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="form-grupo">
                <label>Titulo:</label>
                <input type="text" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} required />
              </div>
              <div className="form-grupo">
                <label>Descripcion:</label>
                <input type="text" value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>Seccion:</label>
                <input type="text" value={editSeccion} onChange={(e) => setEditSeccion(e.target.value)} required placeholder="Ej: Manual de Sistemas" />
              </div>
              <div className="form-botones">
                <button type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                <button type="button" className="btn-cancelar" onClick={cerrarEdicion}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        visible={confirmEliminar !== null}
        title="Eliminar documento"
        message="¿Seguro que queres eliminar este documento? Esta accion no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmEliminar !== null) {
            eliminarDocumento(confirmEliminar);
            setConfirmEliminar(null);
          }
        }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </>
  );
}

export default Documentacion;
