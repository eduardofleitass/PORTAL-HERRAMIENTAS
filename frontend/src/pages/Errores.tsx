import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Forma de cada error segun el backend
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

  // Modulos unicos para el filtro
  const modulosUnicos = Array.from(
    new Set(errores.map((e) => e.modulo_afectado))
  );

  // Frecuencias unicas para el filtro
  const frecuenciasUnicas = Array.from(
    new Set(errores.map((e) => e.frecuencia))
  );

  // Aplicamos filtros
  const filtrados = errores.filter((e) => {
    const coincideModulo = moduloFiltro
      ? e.modulo_afectado === moduloFiltro
      : true;
    const coincideFrecuencia = frecuenciaFiltro
      ? e.frecuencia === frecuenciaFiltro
      : true;
    return coincideModulo && coincideFrecuencia;
  });

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

      {/* Filtros */}
      <div className="filtros-row">
        <div className="filtro-container">
          <label>Modulo:</label>
          <select
            value={moduloFiltro}
            onChange={(e) => {
              setModuloFiltro(e.target.value);
              setSeleccionado(null);
            }}
          >
            <option value="">Todos</option>
            {modulosUnicos.map((modulo) => (
              <option key={modulo} value={modulo}>
                {modulo}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-container">
          <label>Frecuencia:</label>
          <select
            value={frecuenciaFiltro}
            onChange={(e) => {
              setFrecuenciaFiltro(e.target.value);
              setSeleccionado(null);
            }}
          >
            <option value="">Todas</option>
            {frecuenciasUnicas.map((freq) => (
              <option key={freq} value={freq}>
                {freq}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados */}
      {loading && <p className="loading">Cargando errores...</p>}
      {errorMsg && <p className="error">{errorMsg}</p>}

      {/* Listado */}
      {!loading && !errorMsg && (
        <div className="lista-errores">
          {filtrados.length === 0 && (
            <p>No hay errores con esos filtros.</p>
          )}

          {filtrados.map((err) => (
            <div
              key={err.id}
              className={`error-item ${
                seleccionado?.id === err.id ? "activo" : ""
              }`}
              onClick={() => setSeleccionado(err)}
            >
              <div className="error-codigo">{err.codigo}</div>
              <h3>{err.titulo}</h3>
              <div className="error-meta">
                <span className="modulo">{err.modulo_afectado}</span>
                <span className={`frecuencia freq-${err.frecuencia}`}>
                  {err.frecuencia}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle */}
      {seleccionado && (
        <div className="detalle-error">
          <h2>
            {seleccionado.codigo} — {seleccionado.titulo}
          </h2>

          <div className="detalle-seccion">
            <h4>Descripcion</h4>
            <p>{seleccionado.descripcion}</p>
          </div>

          <div className="detalle-seccion">
            <h4>Causa</h4>
            <p>{seleccionado.causa}</p>
          </div>

          <div className="detalle-seccion">
            <h4>Solucion</h4>
            <p>{seleccionado.solucion}</p>
          </div>

          <div className="detalle-tags">
            {seleccionado.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <button onClick={() => setSeleccionado(null)}>
            Cerrar detalle
          </button>
        </div>
      )}
    </div>
  );
}

export default Errores;
