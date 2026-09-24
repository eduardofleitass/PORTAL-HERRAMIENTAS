import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  const navigate = useNavigate();

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seccionFiltro, setSeccionFiltro] = useState("");

  // Formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [seccion, setSeccion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const respuesta = await fetch("http://localhost:3001/documentacion");
        const datos = await respuesta.json();
        setDocumentos(datos);
      } catch (err) {
        setError("No se pudieron cargar los documentos");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const seccionesUnicas = Array.from(
    new Set(documentos.map((d) => d.seccion))
  );

  const filtrados = seccionFiltro
    ? documentos.filter((d) => d.seccion === seccionFiltro)
    : documentos;

  async function guardarDocumento(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGuardar("");
    setGuardando(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorGuardar("No hay sesion activa.");
      setGuardando(false);
      return;
    }

    if (!archivo) {
      setErrorGuardar("Debe seleccionar un archivo");
      setGuardando(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("titulo", titulo);
      formData.append("descripcion", descripcion);
      formData.append("seccion", seccion);

      const respuesta = await fetch("http://localhost:3001/documentacion", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setErrorGuardar(datos.message || "Error al subir");
        setGuardando(false);
        return;
      }

      const creado = await respuesta.json();
      setDocumentos((prev) => [...prev, creado]);

      // Limpiar
      setTitulo("");
      setDescripcion("");
      setSeccion("");
      setArchivo(null);
      setMostrarFormulario(false);

    } catch (err) {
      setErrorGuardar("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  }

  function volver() {
    navigate("/");
  }

  return (
    <div className="documentacion-page">
      <header className="page-header">
        <h1>Documentacion</h1>
        <div className="header-actions">
          <button onClick={volver}>← Volver al Dashboard</button>
          {usuario && <span>{usuario.nombre}</span>}
        </div>
      </header>

      {/* Boton + Nuevo */}
      {!mostrarFormulario && !loading && usuario?.rol === "admin" && (
        <button className="btn-nuevo" onClick={() => setMostrarFormulario(true)}>
          + Subir Documento
        </button>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
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
            <input
              type="file"
              onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)}
              required
            />
            {archivo && <p className="archivo-seleccionado">Seleccionado: {archivo.name}</p>}
          </div>

          <div className="form-botones">
            <button type="submit" disabled={guardando}>{guardando ? "Subiendo..." : "Subir"}</button>
            <button type="button" className="btn-cancelar" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtro */}
      <div className="filtro-container">
        <label>Filtrar por seccion:</label>
        <select value={seccionFiltro} onChange={(e) => setSeccionFiltro(e.target.value)}>
          <option value="">Todas las secciones</option>
          {seccionesUnicas.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Estados */}
      {loading && <p className="loading">Cargando documentos...</p>}
      {error && <p className="error">{error}</p>}

      {/* Listado */}
      {!loading && !error && (
        <div className="lista-documentos">
          {filtrados.length === 0 && <p>No hay documentos en esta seccion.</p>}
          {filtrados.map((doc) => (
            <div key={doc.id} className="documento-item">
              <h3>{doc.titulo}</h3>
              <p>{doc.descripcion}</p>
              <div className="documento-meta">
                <span className="seccion">{doc.seccion}</span>
                <span>{doc.nombreArchivo}</span>
                <span>{(doc.tamano / 1024).toFixed(1)} KB</span>
              </div>
              <a
                href={`http://localhost:3001${doc.rutaArchivo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-descargar"
              >
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Documentacion;
