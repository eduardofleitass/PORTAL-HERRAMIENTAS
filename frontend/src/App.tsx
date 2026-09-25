import { useState, useEffect, lazy, Suspense } from "react";
import { Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Sidebar from "./components/Sidebar";
import PublicRoute from "./components/PublicRoute";
import SessionInterceptor from "./components/SessionInterceptor";
import SearchModal from "./components/SearchModal";

// Carga diferida: cada pagina se descarga solo cuando se visita
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Procedimientos = lazy(() => import("./pages/Procedimientos"));
const Errores = lazy(() => import("./pages/Errores"));
const Documentacion = lazy(() => import("./pages/Documentacion"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Logs = lazy(() => import("./pages/Logs"));

/** Pantalla mientras se descarga el chunk de la pagina */
function CargandoPagina() {
  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
      <span>Cargando...</span>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionInterceptor />
      <Suspense fallback={<CargandoPagina />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function AppLayout() {
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    setSidebarVisible((prev) => !prev);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchVisible(true);
      }
      if (e.key === "Escape") {
        setSearchVisible(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />
      <button className="mobile-hamburger" onClick={() => setMobileOpen(true)} title="Menu">
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="17" y2="1" />
          <line x1="1" y1="7" x2="17" y2="7" />
          <line x1="1" y1="13" x2="17" y2="13" />
        </svg>
      </button>
      <Sidebar visible={sidebarVisible} onToggle={toggleSidebar} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} onSearchOpen={() => setSearchVisible(true)} />
      <main className={`main-content ${sidebarVisible ? "" : "main-full"}`}>
        <div key={location.pathname} className="page-wrapper">
          <Suspense fallback={<CargandoPagina />}>
            <Routes location={location}>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/procedimientos" element={<ProtectedRoute><Procedimientos /></ProtectedRoute>} />
              <Route path="/errores" element={<ProtectedRoute><Errores /></ProtectedRoute>} />
              <Route path="/documentacion" element={<ProtectedRoute><Documentacion /></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
              <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
              <Route path="*" element={<ProtectedRoute><NoEncontrado /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </div>
  );
}

/** Pagina 404 dentro del layout (con sidebar) */
function NoEncontrado() {
  return (
    <div className="no-encontrado">
      <div className="no-encontrado-code">404</div>
      <h1>Pagina no encontrada</h1>
      <p>La ruta que buscas no existe o fue movida.</p>
      <a href="/" className="btn-primario">Volver al dashboard</a>
    </div>
  );
}

export default App;
