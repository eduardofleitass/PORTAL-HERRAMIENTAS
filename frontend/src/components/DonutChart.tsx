interface Segmento {
  label: string;
  valor: number;
  color: string;
}

interface DonutChartProps {
  data: Record<string, number> | Segmento[];
  paleta: string[];
  centroLabel?: string;
  tamano?: number;
  grosor?: number;
}

/**
 * Donut chart de proporcion en SVG puro (sin librerias).
 * Muestra la distribucion porcentual de un conjunto de datos categoricos.
 */
function DonutChart({
  data,
  paleta,
  centroLabel,
  tamano = 160,
  grosor = 22,
}: DonutChartProps) {
  // Normalizar entrada
  const segmentos: Segmento[] = Array.isArray(data)
    ? data
    : Object.entries(data).map(([label, valor], i) => ({
        label,
        valor,
        color: paleta[i % paleta.length],
      }));

  const total = segmentos.reduce((acc, s) => acc + s.valor, 0);
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const centro = tamano / 2;

  if (total === 0) {
    return (
      <div className="donut-empty">
        <div className="donut-wrapper" style={{ width: tamano, height: tamano }}>
          <svg width={tamano} height={tamano}>
            <circle
              cx={centro}
              cy={centro}
              r={radio}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth={grosor}
            />
          </svg>
          <div className="donut-center">
            <span className="donut-center-value">0</span>
            <span className="donut-center-label">{centroLabel ?? "total"}</span>
          </div>
        </div>
        <p className="muted">Sin datos</p>
      </div>
    );
  }

  let acumulado = 0;

  return (
    <div className="donut-layout">
      {/* Anillo */}
      <div className="donut-wrapper" style={{ width: tamano, height: tamano }}>
        <svg width={tamano} height={tamano} style={{ transform: "rotate(-90deg)" }}>
          {segmentos.map((seg) => {
            const fraccion = seg.valor / total;
            const largo = fraccion * circunferencia;
            const offset = -acumulado * circunferencia;
            acumulado += fraccion;
            return (
              <circle
                key={seg.label}
                cx={centro}
                cy={centro}
                r={radio}
                fill="none"
                stroke={seg.color}
                strokeWidth={grosor}
                strokeDasharray={`${largo} ${circunferencia - largo}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                className="donut-segment"
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <span className="donut-center-value">{total}</span>
          <span className="donut-center-label">{centroLabel ?? "total"}</span>
        </div>
      </div>

      {/* Leyenda */}
      <ul className="donut-legend">
        {segmentos.map((seg) => {
          const pct = total > 0 ? Math.round((seg.valor / total) * 100) : 0;
          return (
            <li key={seg.label} className="donut-legend-item">
              <span className="donut-dot" style={{ background: seg.color }} />
              <span className="donut-legend-label">{seg.label}</span>
              <span className="donut-legend-value">{seg.valor}</span>
              <span className="donut-legend-pct">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DonutChart;
