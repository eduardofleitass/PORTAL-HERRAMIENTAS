import { useState, useMemo, useEffect } from "react";

export interface UsePaginationOptions {
  /** Cantidad de elementos por pagina (por defecto 10) */
  porPagina?: number;
  /** Reinicia a la pagina 1 cuando cambia este valor (util para filtros) */
  reiniciarEn?: unknown;
}

export interface UsePaginationResult<T> {
  /** Todos los items recibidos */
  items: T[];
  /** Items de la pagina actual */
  itemsPagina: T[];
  paginaActual: number;
  totalPaginas: number;
  totalItems: number;
  desde: number;
  hasta: number;
  setPagina: (p: number) => void;
  siguiente: () => void;
  anterior: () => void;
  /** Rango de paginas a mostrar (con elipsis) */
  rango: (number | "…")[];
  hayAnterior: boolean;
  haySiguiente: boolean;
}

/**
 * Hook de paginacion del lado del cliente.
 *
 * Uso:
 *   const pag = usePagination(filtrados, { porPagina: 10, reiniciarEn: filtro });
 *   pag.itemsPagina.map(...)
 */
export function usePagination<T>(
  items: T[],
  { porPagina = 10, reiniciarEn }: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const [paginaActual, setPaginaActual] = useState(1);

  const totalItems = items.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina));

  // Reiniciar a la pagina 1 cuando cambia el filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [reiniciarEn]);

  // Si la pagina actual queda fuera de rango (ej: se elimino un item), retroceder
  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
  }, [paginaActual, totalPaginas]);

  const itemsPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return items.slice(inicio, inicio + porPagina);
  }, [items, paginaActual, porPagina]);

  const desde = totalItems === 0 ? 0 : (paginaActual - 1) * porPagina + 1;
  const hasta = Math.min(paginaActual * porPagina, totalItems);

  function setPagina(p: number) {
    const destino = Math.min(Math.max(1, p), totalPaginas);
    setPaginaActual(destino);
  }

  const siguiente = () => setPagina(paginaActual + 1);
  const anterior = () => setPagina(paginaActual - 1);

  // Rango con elipsis: 1 … 4 5 6 … 20
  function rango(): (number | "…")[] {
    const total = totalPaginas;
    const actual = paginaActual;
    const delta = 1;
    const paginas: (number | "…")[] = [];

    const numeros = new Set<number>();
    for (let i = 1; i <= Math.min(2, total); i++) numeros.add(i);
    for (let i = Math.max(1, actual - delta); i <= Math.min(total, actual + delta); i++) numeros.add(i);
    for (let i = Math.max(1, total - 1); i <= total; i++) numeros.add(i);

    const ordenados = Array.from(numeros).sort((a, b) => a - b);
    let previo = 0;
    for (const n of ordenados) {
      if (previo && n - previo > 1) paginas.push("…");
      paginas.push(n);
      previo = n;
    }
    return paginas;
  }

  return {
    items,
    itemsPagina,
    paginaActual,
    totalPaginas,
    totalItems,
    desde,
    hasta,
    setPagina,
    siguiente,
    anterior,
    rango: rango(),
    hayAnterior: paginaActual > 1,
    haySiguiente: paginaActual < totalPaginas,
  };
}
