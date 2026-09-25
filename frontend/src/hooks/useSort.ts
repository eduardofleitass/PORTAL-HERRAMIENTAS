import { useState, useMemo } from "react";

export type SortDir = "asc" | "desc";

export interface UseSortResult<T> {
  itemsOrdenados: T[];
  campo: string | null;
  dir: SortDir;
  /** Alterna asc -> desc -> asc para el campo dado */
  ordenarPor: (campo: string) => void;
  /** Devuelve la direccion activa para un campo (o null) */
  dirDe: (campo: string) => SortDir | null;
}

/**
 * Hook de ordenamiento del lado del cliente.
 * Compara strings con localeCompare (soporta acentos) y numeros numericamente.
 *
 * Uso:
 *   const ord = useSort(filtrados, "titulo");
 *   ord.itemsOrdenados.map(...)
 *   <th onClick={() => ord.ordenarPor("titulo")}>Titulo {icono(ord.dirDe("titulo"))}</th>
 */
export function useSort<T>(
  items: T[],
  campoInicial: string | null = null,
  dirInicial: SortDir = "asc"
): UseSortResult<T> {
  const [campo, setCampo] = useState<string | null>(campoInicial);
  const [dir, setDir] = useState<SortDir>(dirInicial);

  function ordenarPor(nuevoCampo: string) {
    // Cadena vacia = quitar ordenamiento
    if (!nuevoCampo) {
      setCampo(null);
      setDir("asc");
      return;
    }
    if (nuevoCampo === campo) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCampo(nuevoCampo);
      setDir("asc");
    }
  }

  function dirDe(c: string): SortDir | null {
    return c === campo ? dir : null;
  }

  const itemsOrdenados = useMemo(() => {
    if (!campo) return items;
    const copia = [...items];
    copia.sort((a, b) => {
      const va = (a as Record<string, unknown>)[campo];
      const vb = (b as Record<string, unknown>)[campo];

      // Nulos al final
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return copia;
  }, [items, campo, dir]);

  return { itemsOrdenados, campo, dir, ordenarPor, dirDe };
}
