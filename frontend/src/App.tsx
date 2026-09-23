import { Route, Routes, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from "./pages/Procedimientos";
import Errores from "./pages/Errores";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login es PUBLICO: cualquiera puede entrar */}
        <Route path="/login" element={<Login />} />

        {/* Rutas PROTEGIDAS: solo usuarios logueados */}
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
    </BrowserRouter>
  );
}

export default App;