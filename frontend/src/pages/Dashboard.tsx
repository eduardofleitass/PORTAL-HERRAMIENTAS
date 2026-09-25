import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Clock,
  Hash
} from "lucide-react";
import DonutChart from "../components/DonutChart";

interface MetricasData {
  totales: { procedimientos: number; errores: number; documentacion: number };
  procedimientosPorModulo: Record<string, number>;
  procedimientosPorNivel: Record<string, number>;
  erroresPorModulo: Record<string, number>;
  erroresPorFrecuencia: Record<string, number>;
  documentosPorSeccion: Record<string, number>;
  tagsTop: { tag: string; count: number }[];
  ultimosAgregados: {
    procedimientos: { id: number; titulo: string; modulo: string }[];
    errores: { id: number; codigo: string; titulo: string; modulo: string }[];
  };
}

function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<MetricasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const [modulosResp, metricasResp] = await Promise.all([
          fetch("http://localhost:3001/configuracion/modulos-portal"),
          fetch("http://localhost:3001/metricas"),
        ]);
        await modulosResp.json();
        const metricasData = await metricasResp.json();
        setMetricas(metricasData);
      } catch {
        setError("No se pudieron cargar las metricas");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const paletaPrimaria = ["#c9965e", "#a67c45", "#d4a96e", "#8a6838", "#e0bc85"];
  const paletaErrores = ["#c97a7a", "#a85a5a", "#d99a9a", "#8a4848", "#e0b0b0"];
  const paletaNiveles = ["#7cb987", "#c9a66b", "#7ab8c4", "#5a9a6a", "#a08ec7"];

  return (
    <div className="dashboard-container">
      <div className="dashboard-welcome">
        <h1>Dashboard</h1>
        {usuario && (
          <>
            <span className="rol-badge">{usuario.nombre}</span>
            <p>Resumen del portal de herramientas</p>
          </>
        )}
      </div>

      {loading && <p className="loading">Cargando metricas...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && metricas && (
        <>
          {/* Totales */}
          <div className="metricas-totales">
            <div className="metrica-card metrica-procedimientos" onClick={() => navigate("/procedimientos")}>
              <div className="metrica-icon"><ClipboardList size={24} /></div>
              <div className="metrica-info">
                <span className="metrica-valor">{metricas.totales.procedimientos}</span>
                <span className="metrica-label">Procedimientos</span>
              </div>
              <TrendingUp size={16} className="metrica-trend" />
            </div>
            <div className="metrica-card metrica-errores" onClick={() => navigate("/errores")}>
              <div className="metrica-icon"><Search size={24} /></div>
              <div className="metrica-info">
                <span className="metrica-valor">{metricas.totales.errores}</span>
                <span className="metrica-label">Errores</span>
              </div>
              <AlertCircle size={16} className="metrica-trend" />
            </div>
            <div className="metrica-card metrica-docs" onClick={() => navigate("/documentacion")}>
              <div className="metrica-icon"><BookOpen size={24} /></div>
              <div className="metrica-info">
                <span className="metrica-valor">{metricas.totales.documentacion}</span>
                <span className="metrica-label">Documentos</span>
              </div>
              <Hash size={16} className="metrica-trend" />
            </div>
          </div>

          {/* Donuts de proporcion */}
          <div className="metricas-grid">
            <div className="metricas-panel">
              <h3><ClipboardList size={16} /> Procedimientos por modulo</h3>
              <DonutChart
                data={metricas.procedimientosPorModulo}
                paleta={paletaPrimaria}
                centroLabel="procedimientos"
              />
            </div>

            <div className="metricas-panel">
              <h3><Search size={16} /> Errores por modulo</h3>
              <DonutChart
                data={metricas.erroresPorModulo}
                paleta={paletaErrores}
                centroLabel="errores"
              />
            </div>

            <div className="metricas-panel">
              <h3><Clock size={16} /> Procedimientos por nivel</h3>
              <DonutChart
                data={Object.fromEntries(
                  Object.entries(metricas.procedimientosPorNivel).map(([k, v]) => [
                    k.charAt(0).toUpperCase() + k.slice(1),
                    v,
                  ])
                )}
                paleta={paletaNiveles}
                centroLabel="niveles"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
