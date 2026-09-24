import { Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from "./pages/Procedimientos";
import Errores from "./pages/Errores";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

function AppContent() {
  const location = useLocation();

  // No mostrar Navbar en /login
  const mostrarNavbar = location.pathname !== "/login";

  return (
    <>
      {mostrarNavbar && <Navbar />}

      <Routes>
        {/* Login PUBLICO */}
        <Route path="/login" element={<Login />} />

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