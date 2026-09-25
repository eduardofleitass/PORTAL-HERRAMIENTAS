import { useState, useEffect } from "react";
import { Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from "./pages/Procedimientos";
import Errores from "./pages/Errores";
import Documentacion from "./pages/Documentacion";
import Usuarios from "./pages/Usuarios";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Sidebar from "./components/Sidebar";
import PublicRoute from "./components/PublicRoute";
import SessionInterceptor from "./components/SessionInterceptor";
import SearchModal from "./components/SearchModal";

function App() {
  return (
    <BrowserRouter>
      <SessionInterceptor />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
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
          <Routes location={location}>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/procedimientos" element={<ProtectedRoute><Procedimientos /></ProtectedRoute>} />
            <Route path="/errores" element={<ProtectedRoute><Errores /></ProtectedRoute>} />
            <Route path="/documentacion" element={<ProtectedRoute><Documentacion /></ProtectedRoute>} />
            <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
          </Routes>
        </div>
      </main>
      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </div>
  );
}

export default App;
