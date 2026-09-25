import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, AlertCircle, ClipboardList, Loader } from "lucide-react";

interface Resultado {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: "documento" | "error" | "procedimiento";
  seccion?: string;
  modulo?: string;
}

function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const buscar = useCallback(async (texto: string) => {
    if (!texto.trim()) { setResultados([]); return; }
    setLoading(true);
    try {
      const [docRes, errRes, procRes] = await Promise.all([
        fetch("http://localhost:3001/documentacion"),
        fetch("http://localhost:3001/errores"),
        fetch("http://localhost:3001/procedimientos"),
      ]);
      const documentos = docRes.ok ? await docRes.json() : [];
      const errores = errRes.ok ? await errRes.json() : [];
      const procedimientos = procRes.ok ? await procRes.json() : [];

      const q = texto.toLowerCase();
      const todos: Resultado[] = [
        ...documentos
          .filter((d: any) => d.titulo?.toLowerCase().includes(q) || d.descripcion?.toLowerCase().includes(q))
          .map((d: any) => ({ id: d.id, titulo: d.titulo, descripcion: d.descripcion, tipo: "documento" as const, seccion: d.seccion })),
        ...errores
          .filter((e: any) => e.titulo?.toLowerCase().includes(q) || e.descripcion?.toLowerCase().includes(q) || e.codigo?.toLowerCase().includes(q))
          .map((e: any) => ({ id: e.id, titulo: e.titulo || e.codigo, descripcion: e.descripcion, tipo: "error" as const, modulo: e.modulo })),
        ...procedimientos
          .filter((p: any) => p.titulo?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q))
          .map((p: any) => ({ id: p.id, titulo: p.titulo, descripcion: p.descripcion, tipo: "procedimiento" as const, modulo: p.modulo })),
      ];
      setResultados(todos.slice(0, 12));
    } catch {
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResultados([]);
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 250);
    return () => clearTimeout(t);
  }, [query, buscar]);

  function irAResultado(r: Resultado) {
    onClose();
    const rutas = { documento: "/documentacion", error: "/errores", procedimiento: "/procedimientos" };
    navigate(rutas[r.tipo]);
  }

  if (!visible) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documentos, errores o procedimientos..."
            className="search-input"
          />
          {loading && <Loader size={16} className="search-loader" />}
          <button className="search-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="search-results">
          {resultados.length === 0 && query.trim() && !loading && (
            <p className="search-empty">No se encontraron resultados.</p>
          )}
          {resultados.map((r) => (
            <button key={`${r.tipo}-${r.id}`} className="search-result-item" onClick={() => irAResultado(r)}>
              {r.tipo === "documento" && <FileText size={16} className="search-result-icon search-icon-doc" />}
              {r.tipo === "error" && <AlertCircle size={16} className="search-result-icon search-icon-err" />}
              {r.tipo === "procedimiento" && <ClipboardList size={16} className="search-result-icon search-icon-proc" />}
              <div className="search-result-info">
                <span className="search-result-title">{r.titulo}</span>
                {r.descripcion && <span className="search-result-desc">{r.descripcion}</span>}
              </div>
              <span className={`search-result-tag search-tag-${r.tipo}`}>{r.tipo}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
