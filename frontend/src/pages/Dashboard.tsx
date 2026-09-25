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
  Hash,
  Tag
} from "lucide-react";

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

  function barraHorizontal(label: string, valor: number, max: number, color: string) {
    const porcentaje = max > 0 ? (valor / max) * 100 : 0;
    return (
      <div className="barra-item" key={label}>
        <div className="barra-label">
          <span>{label}</span>
          <span className="barra-valor">{valor}</span>
        </div>
        <div className="barra-track">
          <div className="barra-fill" style={{ width: `${porcentaje}%`, background: color }} />
        </div>
      </div>
    );
  }

  const maxProcs = metricas ? Math.max(...Object.values(metricas.procedimientosPorModulo), 1) : 1;
  const maxErrores = metricas ? Math.max(...Object.values(metricas.erroresPorModulo), 1) : 1;
  const maxNiveles = metricas ? Math.max(...Object.values(metricas.procedimientosPorNivel), 1) : 1;

  const colores = {
    primario: "linear-gradient(90deg, #c9965e, #a67c45)",
    verde: "linear-gradient(90deg, #5a9a6a, #3d7a4e)",
    naranja: "linear-gradient(90deg, #b8926b, #8a6a4b)",
    rojo: "linear-gradient(90deg, #b86868, #8a4848)",
    morado: "linear-gradient(90deg, #7a6a9e, #5a4a7e)",
  };

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

          {/* Barras */}
          <div className="metricas-grid">
            <div className="metricas-panel">
              <h3><ClipboardList size={16} /> Procedimientos por modulo</h3>
              <div className="barras-lista">
                {Object.entries(metricas.procedimientosPorModulo).map(([label, val]) =>
                  barraHorizontal(label, val, maxProcs, colores.primario)
                )}
              </div>
            </div>

            <div className="metricas-panel">
              <h3><Search size={16} /> Errores por modulo</h3>
              <div className="barras-lista">
                {Object.entries(metricas.erroresPorModulo).map(([label, val]) =>
                  barraHorizontal(label, val, maxErrores, colores.rojo)
                )}
              </div>
            </div>

            <div className="metricas-panel">
              <h3><Clock size={16} /> Procedimientos por nivel</h3>
              <div className="barras-lista">
                {Object.entries(metricas.procedimientosPorNivel).map(([label, val]) =>
                  barraHorizontal(label.charAt(0).toUpperCase() + label.slice(1), val, maxNiveles, colores.verde)
                )}
              </div>
            </div>

            <div className="metricas-panel">
              <h3><AlertCircle size={16} /> Errores por frecuencia</h3>
              <div className="barras-lista">
                {Object.entries(metricas.erroresPorFrecuencia).map(([label, val]) => {
                  const color = label === "alta" ? colores.rojo : label === "media" ? colores.naranja : colores.verde;
                  return barraHorizontal(label.charAt(0).toUpperCase() + label.slice(1), val, 3, color);
                })}
              </div>
            </div>
          </div>

          {/* Tags + Ultimos */}
          <div className="metricas-grid">
            <div className="metricas-panel">
              <h3><Tag size={16} /> Tags mas usados</h3>
              <div className="tags-cloud">
                {metricas.tagsTop.length === 0 && <p className="muted">No hay tags aun.</p>}
                {metricas.tagsTop.map((t) => (
                  <span key={t.tag} className="tag-chip" onClick={() => navigate("/errores")}>
                    {t.tag}
                    <span className="tag-count">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="metricas-panel">
              <h3><Clock size={16} /> Ultimos agregados</h3>
              <div className="ultimos-lista">
                {metricas.ultimosAgregados.procedimientos.length === 0 && metricas.ultimosAgregados.errores.length === 0 && <p className="muted">Sin registros nuevos.</p>}
                {metricas.ultimosAgregados.procedimientos.map((p) => (
                  <div key={`p-${p.id}`} className="ultimo-item" onClick={() => navigate("/procedimientos")}>
                    <div className="ultimo-tipo tipo-proc">P</div>
                    <div className="ultimo-info">
                      <span className="ultimo-titulo">{p.titulo}</span>
                      <span className="ultimo-meta">{p.modulo}</span>
                    </div>
                  </div>
                ))}
                {metricas.ultimosAgregados.errores.map((e) => (
                  <div key={`e-${e.id}`} className="ultimo-item" onClick={() => navigate("/errores")}>
                    <div className="ultimo-tipo tipo-err">E</div>
                    <div className="ultimo-info">
                      <span className="ultimo-titulo">{e.codigo}</span>
                      <span className="ultimo-meta">{e.modulo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
