import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDir } from "../hooks/useSort";

interface OrdenSelectorProps {
  /** Opciones: valor del campo y etiqueta visible */
  opciones: { campo: string; label: string }[];
  campoActivo: string | null;
  dir: SortDir;
  onOrdenar: (campo: string) => void;
}

/**
 * Barra de ordenamiento compacta: un <select> de campo + boton de direccion.
 * Se usa arriba de las listas para ordenar sin ocupar espacio de tabla.
 */
function OrdenSelector({ opciones, campoActivo, dir, onOrdenar }: OrdenSelectorProps) {
  return (
    <div className="orden-selector">
      <label>Ordenar por:</label>
      <select
        value={campoActivo ?? ""}
        onChange={(e) => onOrdenar(e.target.value)}
      >
        <option value="">Por defecto</option>
        {opciones.map((o) => (
          <option key={o.campo} value={o.campo}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="orden-dir"
        onClick={() => campoActivo && onOrdenar(campoActivo)}
        disabled={!campoActivo}
        title={dir === "asc" ? "Ascendente (clic para invertir)" : "Descendente (clic para invertir)"}
        aria-label="Invertir orden"
      >
        {dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </button>
    </div>
  );
}

/**
 * Icono de orden para usar en encabezados de lista.
 */
export function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <ArrowUpDown size={12} className="sort-icon-idle" />;
  return dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

export default OrdenSelector;
