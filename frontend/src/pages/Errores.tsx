import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Error {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  causa: string;
  solucion: string;
  modulo_afectado: string;
  frecuencia: string;
  tags: string[];
}

function Errores() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [errores, setErrores] = useState<Error[]>([]);
  const [seleccionado, setSeleccionado] = useState<Error | null>(null);
  const [moduloFiltro, setModuloFiltro] = useState("");
  const [frecuenciaFiltro, setFrecuenciaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Estados formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaCausa, setNuevaCausa] = useState("");
  const [nuevaSolucion, setNuevaSolucion] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [nuevaFrecuencia, setNuevaFrecuencia] = useState("alta");
  const [nuevosTags, setNuevosTags] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  useEffect(() => {
    async function cargarErrores() {
      try {
        const respuesta = await fetch("http://localhost:3001/errores");
        const datos = await respuesta.json();
        setErrores(datos);
      } catch (err) {
        setErrorMsg("No se pudieron cargar los errores");
      } finally {
        setLoading(false);
      }
    }
    cargarErrores();
  }, []);

  const modulosUnicos = Array.from(
    new Set(errores.map((e) => e.modulo_afectado))
  );
  const frecuenciasUnicas = Array.from(
    new Set(errores.map((e) => e.frecuencia))
  );

  const filtrados = errores.filter((e) => {
    const coincideModulo = moduloFiltro ? e.modulo_afectado === moduloFiltro : true;
    const coincideFrecuencia = frecuenciaFiltro ? e.frecuencia === frecuenciaFiltro : true;
    return coincideModulo && coincideFrecuencia;
  });

  async function guardarError(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGuardar("");
    setGuardando(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorGuardar("No hay sesion activa.");
      setGuardando(false);
      return;
    }

    try {
      const respuesta = await fetch("http://localhost:3001/errores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          codigo: nuevoCodigo,
          titulo: nuevoTitulo,
          descripcion: nuevaDescripcion,
          causa: nuevaCausa,
          solucion: nuevaSolucion,
          modulo_afectado: nuevoModulo,
          frecuencia: nuevaFrecuencia,
          tags: nuevosTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
        })
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setErrorGuardar(datos.message || "Error al guardar");
        setGuardando(false);
        return;
      }

      const creado = await respuesta.json();
      setErrores((prev) => [...prev, creado]);

      // Limpiar
      setNuevoCodigo("");
      setNuevoTitulo("");
      setNuevaDescripcion("");
      setNuevaCausa("");
      setNuevaSolucion("");
      setNuevoModulo("");
      setNuevaFrecuencia("alta");
      setNuevosTags("");
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
    <div className="errores-page">
      <header className="page-header">
        <h1>Buscar Errores</h1>
        <div className="header-actions">
          <button onClick={volver}>← Volver al Dashboard</button>
          {usuario && <span>{usuario.nombre}</span>}
        </div>
      </header>

      {/* Boton + Nuevo */}
      {!mostrarFormulario && !loading && usuario?.rol === "admin" && (
        <button className="btn-nuevo" onClick={() => setMostrarFormulario(true)}>
          + Nuevo Error
        </button>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
        <form className="formulario-procedimiento" onSubmit={guardarError}>
          <h3>Nuevo Error</h3>
          {errorGuardar && <p className="error">{errorGuardar}</p>}

          <div className="form-grupo"><label>Codigo:</label>
            <input type="text" value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)} required placeholder="Ej: SIFEN-004" />
          </div>

          <div className="form-grupo"><label>Titulo:</label>
            <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} required />
          </div>

          <div className="form-grupo"><label>Descripcion:</label>
            <textarea value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} required rows={3} />
          </div>

          <div className="form-grupo"><label>Causa:</label>
            <textarea value={nuevaCausa} onChange={(e) => setNuevaCausa(e.target.value)} required rows={3} />
          </div>

          <div className="form-grupo"><label>Solucion:</label>
            <textarea value={nuevaSolucion} onChange={(e) => setNuevaSolucion(e.target.value)} required rows={3} />
          </div>

          <div className="form-grupo"><label>Modulo afectado:</label>
            <input type="text" value={nuevoModulo} onChange={(e) => setNuevoModulo(e.target.value)} required />
          </div>

          <div className="form-grupo"><label>Frecuencia:</label>
            <select value={nuevaFrecuencia} onChange={(e) => setNuevaFrecuencia(e.target.value)}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="form-grupo"><label>Tags (separados por coma):</label>
            <input type="text" value={nuevosTags} onChange={(e) => setNuevosTags(e.target.value)} placeholder="sifen, error, cdc" />
          </div>

          <div className="form-botones">
            <button type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
            <button type="button" className="btn-cancelar" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="filtros-row">
        <div className="filtro-container">
          <label>Modulo:</label>
          <select value={moduloFiltro} onChange={(e) => { setModuloFiltro(e.target.value); setSeleccionado(null); }}>
            <option value="">Todos</option>
            {modulosUnicos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="filtro-container">
          <label>Frecuencia:</label>
          <select value={frecuenciaFiltro} onChange={(e) => { setFrecuenciaFiltro(e.target.value); setSeleccionado(null); }}>
            <option value="">Todas</option>
            {frecuenciasUnicas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Estados */}
      {loading && <p className="loading">Cargando errores...</p>}
      {errorMsg && <p className="error">{errorMsg}</p>}

      {/* Listado */}
      {!loading && !errorMsg && (
        <div className="lista-errores">
          {filtrados.length === 0 && <p>No hay errores con esos filtros.</p>}
          {filtrados.map((err) => (
            <div key={err.id} className={`error-item ${seleccionado?.id === err.id ? "activo" : ""}`} onClick={() => setSeleccionado(err)}>
              <div className="error-codigo">{err.codigo}</div>
              <h3>{err.titulo}</h3>
              <div className="error-meta">
                <span className="modulo">{err.modulo_afectado}</span>
                <span className={`frecuencia freq-${err.frecuencia}`}>{err.frecuencia}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle */}
      {seleccionado && (
        <div className="detalle-error">
          <h2>{seleccionado.codigo} — {seleccionado.titulo}</h2>
          <div className="detalle-seccion"><h4>Descripcion</h4><p>{seleccionado.descripcion}</p></div>
          <div className="detalle-seccion"><h4>Causa</h4><p>{seleccionado.causa}</p></div>
          <div className="detalle-seccion"><h4>Solucion</h4><p>{seleccionado.solucion}</p></div>
          <div className="detalle-tags">{seleccionado.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
          <button onClick={() => setSeleccionado(null)}>Cerrar detalle</button>
        </div>
      )}
    </div>
  );
}

export default Errores;
