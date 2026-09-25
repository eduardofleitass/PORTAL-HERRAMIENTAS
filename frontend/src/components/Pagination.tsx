import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UsePaginationResult } from "../hooks/usePagination";

interface PaginationProps<T> {
  pag: UsePaginationResult<T>;
  /** Etiqueta singular del elemento (ej: "documento") */
  etiqueta?: string;
}

/**
 * Controles de paginacion: cantidad por pagina, rango visible y navegacion.
 * Se oculta automaticamente si hay una sola pagina.
 */
function Pagination<T>({ pag, etiqueta = "registros" }: PaginationProps<T>) {
  if (pag.totalPaginas <= 1) {
    // Con una sola pagina solo mostramos el conteo, sin controles
    if (pag.totalItems === 0) return null;
    return (
      <div className="pagination-simple">
        {pag.totalItems} {etiqueta}
      </div>
    );
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={pag.anterior}
        disabled={!pag.hayAnterior}
        title="Pagina anterior"
        aria-label="Pagina anterior"
      >
        <ChevronLeft size={14} />
      </button>

      {pag.rango.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="pagination-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`pagination-btn ${p === pag.paginaActual ? "active" : ""}`}
            onClick={() => pag.setPagina(p)}
            aria-current={p === pag.paginaActual ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pagination-btn"
        onClick={pag.siguiente}
        disabled={!pag.haySiguiente}
        title="Pagina siguiente"
        aria-label="Pagina siguiente"
      >
        <ChevronRight size={14} />
      </button>

      <span className="pagination-info">
        {pag.desde}-{pag.hasta} de {pag.totalItems}
      </span>
    </div>
  );
}

export default Pagination;
