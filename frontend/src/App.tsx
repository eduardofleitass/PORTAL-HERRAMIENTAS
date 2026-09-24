import { Route, Routes, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from "./pages/Procedimientos";
import Errores from "./pages/Errores";
import Documentacion from "./pages/Documentacion";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/procedimientos" element={<ProtectedRoute><Procedimientos /></ProtectedRoute>} />
          <Route path="/errores" element={<ProtectedRoute><Errores /></ProtectedRoute>} />
          <Route path="/documentacion" element={<ProtectedRoute><Documentacion /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
