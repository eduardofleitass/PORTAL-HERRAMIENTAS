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
  const { usuario, token } = useAuth();
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

  // === ESTADOS DEL FORMULARIO ===
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState("basico");
  const [nuevoTiempo, setNuevoTiempo] = useState("");
  const [nuevosPasos, setNuevosPasos] = useState<Paso[]>([
    { orden: 1, descripcion: "" }
  ]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

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
  const modulosUnicos = Array.from(
    new Set(procedimientos.map((p) => p.modulo))
  );

  // Filtramos los procedimientos segun el modulo seleccionado
  const filtrados = moduloFiltro
    ? procedimientos.filter((p) => p.modulo === moduloFiltro)
    : procedimientos;

  // === FUNCIONES DEL FORMULARIO ===

  function agregarPaso() {
    setNuevosPasos((prev) => [
      ...prev,
      { orden: prev.length + 1, descripcion: "" }
    ]);
  }

  function cambiarPaso(index: number, descripcion: string) {
    setNuevosPasos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, descripcion } : p))
    );
  }

  function quitarPaso(index: number) {
    setNuevosPasos((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, orden: i + 1 }))
    );
  }

  async function guardarProcedimiento(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGuardar("");
    setGuardando(true);

    try {
      const respuesta = await fetch("http://localhost:3001/procedimientos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: nuevoTitulo,
          modulo: nuevoModulo,
          nivel: nuevoNivel,
          tiempo_estimado: nuevoTiempo,
          pasos: nuevosPasos.filter((p) => p.descripcion.trim() !== "")
        })
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setErrorGuardar(datos.message || "Error al guardar");
        setGuardando(false);
        return;
      }

      const creado = await respuesta.json();
      setProcedimientos((prev) => [...prev, creado]);

      // Limpiamos formulario
      setNuevoTitulo("");
      setNuevoModulo("");
      setNuevoNivel("basico");
      setNuevoTiempo("");
      setNuevosPasos([{ orden: 1, descripcion: "" }]);
      setMostrarFormulario(false);

    } catch (err) {
      setErrorGuardar("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  }

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

      {/* Boton + Nuevo */}
      {!mostrarFormulario && !loading && usuario?.rol === "admin" && (
        <button
          className="btn-nuevo"
          onClick={() => setMostrarFormulario(true)}
        >
          + Nuevo Procedimiento
        </button>
      )}

      {/* Formulario de creacion */}
      {mostrarFormulario && (
        <form className="formulario-procedimiento" onSubmit={guardarProcedimiento}>
          <h3>Nuevo Procedimiento</h3>

          {errorGuardar && <p className="error">{errorGuardar}</p>}

          <div className="form-grupo">
            <label>Titulo:</label>
            <input
              type="text"
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              required
            />
          </div>

          <div className="form-grupo">
            <label>Modulo:</label>
            <input
              type="text"
              value={nuevoModulo}
              onChange={(e) => setNuevoModulo(e.target.value)}
              required
            />
          </div>

          <div className="form-grupo">
            <label>Nivel:</label>
            <select
              value={nuevoNivel}
              onChange={(e) => setNuevoNivel(e.target.value)}
            >
              <option value="basico">Basico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>

          <div className="form-grupo">
            <label>Tiempo estimado:</label>
            <input
              type="text"
              value={nuevoTiempo}
              onChange={(e) => setNuevoTiempo(e.target.value)}
              placeholder="Ej: 10 minutos"
              required
            />
          </div>

          <div className="form-pasos">
            <label>Pasos:</label>
            {nuevosPasos.map((paso, index) => (
              <div key={index} className="paso-input">
                <span>{paso.orden}.</span>
                <input
                  type="text"
                  value={paso.descripcion}
                  onChange={(e) => cambiarPaso(index, e.target.value)}
                  placeholder={`Descripcion del paso ${paso.orden}`}
                />
                {nuevosPasos.length > 1 && (
                  <button type="button" onClick={() => quitarPaso(index)}>
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-agregar" onClick={agregarPaso}>
              + Agregar paso
            </button>
          </div>

          <div className="form-botones">
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => setMostrarFormulario(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtro por modulo */}
      <div className="filtro-container">
        <label>Filtrar por modulo:</label>
        <select
          value={moduloFiltro}
          onChange={(e) => {
            setModuloFiltro(e.target.value);
            setSeleccionado(null);
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
