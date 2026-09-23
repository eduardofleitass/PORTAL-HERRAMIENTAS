import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Le decimos a TypeScript la forma de cada PASO
interface Paso {
  orden: number;
  descripcion: string;
}

// Le decimos la forma de cada PROCEDIMIENTO
interface Procedimiento {
  id: number;
  titulo: string;
  pasos: Paso[];
  modulo: string;
  nivel: string;
  tiempo_estimado: string;
}

function Procedimientos() {
  // Estados
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Guarda la lista completa que viene del backend
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);

  // Guarda el procedimiento seleccionado para ver su detalle
  const [seleccionado, setSeleccionado] = useState<Procedimiento | null>(null);

  // Modulo seleccionado en el filtro
  const [moduloFiltro, setModuloFiltro] = useState("");

  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // useEffect: pedimos los procedimientos al backend al cargar
  useEffect(() => {
    async function cargarProcedimientos() {
      try {
        const respuesta = await fetch("http://localhost:3001/procedimientos");
        const datos = await respuesta.json();
        setProcedimientos(datos);
      } catch (err) {
        setError("No se pudieron cargar los procedimientos");
      } finally {
        setLoading(false);
      }
    }
    cargarProcedimientos();
  }, []);

  // Extraemos los modulos UNICOS para el dropdown de filtro
  // new Set() elimina duplicados. Array.from() convierte de Set a Array.
  const modulosUnicos = Array.from(
    new Set(procedimientos.map((p) => p.modulo))
  );

  // Filtramos los procedimientos segun el modulo seleccionado
  const filtrados = moduloFiltro
    ? procedimientos.filter((p) => p.modulo === moduloFiltro)
    : procedimientos;

  // Funcion para volver al Dashboard
  function volver() {
    navigate("/");
  }

  return (
    <div className="procedimientos-page">
      {/* Header */}
      <header className="page-header">
        <h1>Procedimientos</h1>
        <div className="header-actions">
          <button onClick={volver}>← Volver al Dashboard</button>
          {usuario && <span>{usuario.nombre}</span>}
        </div>
      </header>

      {/* Filtro por modulo */}
      <div className="filtro-container">
        <label>Filtrar por modulo:</label>
        <select
          value={moduloFiltro}
          onChange={(e) => {
            setModuloFiltro(e.target.value);
            setSeleccionado(null); // Limpiamos el seleccionado al cambiar filtro
          }}
        >
          <option value="">Todos los modulos</option>
          {modulosUnicos.map((modulo) => (
            <option key={modulo} value={modulo}>
              {modulo}
            </option>
          ))}
        </select>
      </div>

      {/* Estados */}
      {loading && <p className="loading">Cargando procedimientos...</p>}
      {error && <p className="error">{error}</p>}

      {/* Listado de procedimientos */}
      {!loading && !error && (
        <div className="lista-procedimientos">
          {filtrados.length === 0 && (
            <p>No hay procedimientos para este modulo.</p>
          )}

          {filtrados.map((proc) => (
            <div
              key={proc.id}
              className={`procedimiento-item ${
                seleccionado?.id === proc.id ? "activo" : ""
              }`}
              onClick={() => setSeleccionado(proc)}
            >
              <h3>{proc.titulo}</h3>
              <div className="procedimiento-meta">
                <span className="modulo">{proc.modulo}</span>
                <span className="nivel">{proc.nivel}</span>
                <span className="tiempo">{proc.tiempo_estimado}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle del procedimiento seleccionado */}
      {seleccionado && (
        <div className="detalle-procedimiento">
          <h2>{seleccionado.titulo}</h2>
          <div className="detalle-meta">
            <span>Modulo: {seleccionado.modulo}</span>
            <span>Nivel: {seleccionado.nivel}</span>
            <span>Tiempo: {seleccionado.tiempo_estimado}</span>
          </div>

          <h4>Pasos:</h4>
          <ol className="pasos-lista">
            {seleccionado.pasos.map((paso) => (
              <li key={paso.orden}>
                <strong>Paso {paso.orden}:</strong> {paso.descripcion}
              </li>
            ))}
          </ol>

          <button onClick={() => setSeleccionado(null)}>
            Cerrar detalle
          </button>
        </div>
      )}
    </div>
  );
}

export default Procedimientos;
