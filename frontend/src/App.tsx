import { Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from "./pages/Procedimientos";
import Errores from "./pages/Errores";
import Documentacion from "./pages/Documentacion";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import PublicRoute from "./components/PublicRoute";

function AppContent() {
  const location = useLocation();

  // No mostrar Navbar en /login
  const mostrarNavbar = location.pathname !== "/login";

  return (
    <>
      {mostrarNavbar && <Navbar />}

      <Routes>
        {/* Login PUBLICO */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Rutas PROTEGIDAS */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/procedimientos"
          element={
            <ProtectedRoute>
              <Procedimientos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/errores"
          element={
            <ProtectedRoute>
              <Errores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documentacion"
          element={
            <ProtectedRoute>
              <Documentacion />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;