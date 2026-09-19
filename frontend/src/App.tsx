import {Route, Routes, BrowserRouter} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Procedimientos from"./pages/Procedimientos";
import Errores from "./pages/Errores";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/procedimientos" element={<Procedimientos />} />
        <Route path="/errores" element={<Errores />} />
      </Routes>
    </BrowserRouter>
  );
} export default App;