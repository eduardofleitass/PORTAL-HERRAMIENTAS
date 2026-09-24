import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
}

function Dashboard(){
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargaModulos(){
      try {
        const respuesta = await fetch("http://localhost:3001/configuracion/modulos-portal");
        const datos = await respuesta.json();
        setModulos(datos);
      } catch {
        setError("No se pudieron cargar los modulos del portal");
      } finally {
        setLoading(false);
      }
    }
    cargaModulos();
  }, []);

  // Iconos para cada modulo
  function iconoModulo(nombre: string): string {
    const mapa: Record<string, string> = {
      "Procedimientos": "📋",
      "Errores": "🔍",
      "Documentacion": "📚",
      "Soluciones": "✅",
      "Configuracion": "⚙️"
    };
    return mapa[nombre] || "📦";
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-welcome">
        <h1>Bienvenido al Portal</h1>
        {usuario && (
          <>
            <span className="rol-badge">{usuario.rol}</span>
            <p>Selecciona un modulo para comenzar</p>
          </>
        )}
      </div>

      {loading && <p className="loading">Cargando modulos...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="cards-grid">
          {modulos.map((modulo) => (
            <div
              key={modulo.id}
              className="card"
              onClick={() => navigate(`/${modulo.id}`)}
            >
              <div className="card-icon">{iconoModulo(modulo.nombre)}</div>
              <h3>{modulo.nombre}</h3>
              <p>{modulo.descripcion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
